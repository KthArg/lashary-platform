import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isErr, isOk } from '@/shared/result'
import { reminderRepository } from '../reminder-repository'
import type { ReminderRepository, ReminderUpsert } from '../../application/ports'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const TABLE = 'notifications_reminders'
const STAFF_ROLE = 'admin'
const CLAIM_TTL_MINUTES = 10
const SETUP_TIMEOUT_MS = 60_000
const NO_PERSIST_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } }

const isLocalHost = (rawUrl: string): boolean => {
  try {
    return LOCAL_HOSTS.includes(new URL(rawUrl).hostname)
  } catch {
    return false
  }
}
const isLocalSetup = Boolean(API_URL && ANON_KEY) && isLocalHost(API_URL) && isLocalHost(DB_URL)

async function isReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/rest/v1/`, { headers: { apikey: ANON_KEY } })
    if (response.status >= 500) return false
    const probe = new PgClient({ connectionString: DB_URL })
    await probe.connect()
    await probe.end()
    return true
  } catch {
    return false
  }
}

const reachable = isLocalSetup && (await isReachable())
if (!reachable) {
  console.warn('[notifications/db] Supabase local no disponible — pruebas de integración del repositorio omitidas.')
}

function newUpsert(overrides: Partial<ReminderUpsert> = {}): ReminderUpsert {
  const id = overrides.id ?? crypto.randomUUID()
  return {
    id,
    appointmentId: overrides.appointmentId ?? crypto.randomUUID(),
    clientId: overrides.clientId ?? crypto.randomUUID(),
    startsAt: overrides.startsAt ?? new Date('2042-01-01T15:00:00Z'),
    techniqueName: overrides.techniqueName ?? 'Técnica de prueba',
    sendAt: overrides.sendAt ?? new Date('2042-01-01T14:00:00Z'),
  }
}

describe.skipIf(!reachable)('reminderRepository (Supabase local)', () => {
  let admin: PgClient
  let staffClient: SupabaseClient
  let staffUserId: string
  let repo: ReminderRepository
  const seededIds: string[] = []

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()

    const anon = createClient(API_URL, ANON_KEY, NO_PERSIST_OPTIONS)
    const email = `notifications-repo-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
    const { data, error } = await anon.auth.signUp({ email, password: `pw-${Math.random().toString(36).slice(2)}` })
    if (error || !data.session || !data.user) {
      throw new Error(`no se pudo crear la usuaria de prueba: ${error?.message ?? 'sin sesión'}`)
    }
    staffUserId = data.user.id
    staffClient = createClient(API_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    await admin.query('UPDATE public.auth_user_roles SET role = $1 WHERE user_id = $2', [STAFF_ROLE, staffUserId])

    repo = await reminderRepository(staffClient)
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!admin) return
    if (seededIds.length > 0) {
      await admin.query(`DELETE FROM public.${TABLE} WHERE id = ANY($1::uuid[])`, [seededIds])
    }
    if (staffUserId) await admin.query('DELETE FROM auth.users WHERE id = $1', [staffUserId])
    await admin.end()
  })

  const track = (id: string): string => {
    seededIds.push(id)
    return id
  }

  it('insertIfAbsent inserta una vez y la segunda vez (misma cita) informa que ya existía, sin duplicar', async () => {
    const upsert = newUpsert()
    track(upsert.id)

    const first = await repo.insertIfAbsent(upsert)
    expect(isOk(first)).toBe(true)
    if (isOk(first)) expect(first.value).toEqual({ inserted: true })

    const second = await repo.insertIfAbsent(newUpsert({ id: crypto.randomUUID(), appointmentId: upsert.appointmentId }))
    expect(isOk(second)).toBe(true)
    if (isOk(second)) expect(second.value).toEqual({ inserted: false })

    const { count } = await staffClient.from(TABLE).select('id', { count: 'exact', head: true }).eq('appointment_id', upsert.appointmentId)
    expect(count).toBe(1)
  })

  it('listPending solo trae las filas en pending', async () => {
    const pendingUpsert = newUpsert()
    track(pendingUpsert.id)
    await repo.insertIfAbsent(pendingUpsert)

    const cancelledUpsert = newUpsert()
    track(cancelledUpsert.id)
    await repo.insertIfAbsent(cancelledUpsert)
    await repo.cancelPending(cancelledUpsert.appointmentId)

    const pending = await repo.listPending()
    expect(isOk(pending)).toBe(true)
    if (!isOk(pending)) return
    const ids = pending.value.map((reminder) => reminder.id)
    expect(ids).toContain(pendingUpsert.id)
    expect(ids).not.toContain(cancelledUpsert.id)
  })

  it('reschedulePending solo actualiza una fila que sigue pending', async () => {
    const upsert = newUpsert()
    track(upsert.id)
    await repo.insertIfAbsent(upsert)
    await repo.cancelPending(upsert.appointmentId)

    const newSendAt = new Date('2042-02-01T10:00:00Z')
    const rescheduled = await repo.reschedulePending({
      appointmentId: upsert.appointmentId, startsAt: new Date('2042-02-01T11:00:00Z'),
      techniqueName: 'Técnica reprogramada', sendAt: newSendAt,
    })
    expect(isOk(rescheduled)).toBe(true)

    const { data } = await staffClient.from(TABLE).select('status, send_at').eq('id', upsert.id).single()
    expect(data?.status).toBe('cancelled')
    expect(new Date(data?.send_at as string).getTime()).toBe(upsert.sendAt.getTime())
  })

  it('cancelPending solo cancela una fila que sigue pending', async () => {
    const upsert = newUpsert()
    track(upsert.id)
    await repo.insertIfAbsent(upsert)

    const cancelled = await repo.cancelPending(upsert.appointmentId)
    expect(isOk(cancelled)).toBe(true)

    const { data } = await staffClient.from(TABLE).select('status').eq('id', upsert.id).single()
    expect(data?.status).toBe('cancelled')
  })

  it('claimDuePending reclama lo vencido por send_at, no lo que todavía no vence', async () => {
    const dueUpsert = newUpsert({ sendAt: new Date('2030-01-01T00:00:00Z') })
    track(dueUpsert.id)
    await repo.insertIfAbsent(dueUpsert)

    const futureUpsert = newUpsert({ sendAt: new Date('2099-01-01T00:00:00Z') })
    track(futureUpsert.id)
    await repo.insertIfAbsent(futureUpsert)

    const claimed = await repo.claimDuePending(new Date('2042-06-15T00:00:00Z'))
    expect(isOk(claimed)).toBe(true)
    if (!isOk(claimed)) return
    const claimedIds = claimed.value.map((reminder) => reminder.id)
    expect(claimedIds).toContain(dueUpsert.id)
    expect(claimedIds).not.toContain(futureUpsert.id)

    const { data } = await staffClient.from(TABLE).select('status, claimed_at').eq('id', dueUpsert.id).single()
    expect(data?.status).toBe('claimed')
    expect(data?.claimed_at).not.toBeNull()
  })

  it('claimDuePending nunca reclama una fila claimed, aunque su reclamo esté vencido (ya no es su trabajo, corrección del líder, 2026-10-26)', async () => {
    const upsert = newUpsert({ sendAt: new Date('2030-01-01T00:00:00Z') })
    track(upsert.id)
    await repo.insertIfAbsent(upsert)
    const now = new Date('2042-06-15T00:00:00Z')
    await repo.claimDuePending(now)

    const expiredClaimedAt = new Date(now.getTime() - (CLAIM_TTL_MINUTES + 1) * 60_000)
    await admin.query(`UPDATE public.${TABLE} SET claimed_at = $1 WHERE id = $2`, [expiredClaimedAt.toISOString(), upsert.id])

    const secondClaim = await repo.claimDuePending(now)
    expect(isOk(secondClaim)).toBe(true)
    if (!isOk(secondClaim)) return
    expect(secondClaim.value.map((r) => r.id)).not.toContain(upsert.id)
  })

  it('releaseExpiredClaims vuelve a pending lo que lleva claimed más del TTL, y no toca lo vigente (corrección del líder, 2026-10-26)', async () => {
    const expiredUpsert = newUpsert({ sendAt: new Date('2030-01-01T00:00:00Z') })
    track(expiredUpsert.id)
    await repo.insertIfAbsent(expiredUpsert)

    const freshUpsert = newUpsert({ sendAt: new Date('2030-01-01T00:00:00Z') })
    track(freshUpsert.id)
    await repo.insertIfAbsent(freshUpsert)

    const now = new Date('2042-06-15T00:00:00Z')
    await repo.claimDuePending(now)

    const expiredClaimedAt = new Date(now.getTime() - (CLAIM_TTL_MINUTES + 1) * 60_000)
    await admin.query(`UPDATE public.${TABLE} SET claimed_at = $1 WHERE id = $2`, [expiredClaimedAt.toISOString(), expiredUpsert.id])

    const released = await repo.releaseExpiredClaims(now)
    expect(isOk(released)).toBe(true)
    if (!isOk(released)) return
    const releasedIds = released.value.map((r) => r.id)
    expect(releasedIds).toContain(expiredUpsert.id)
    expect(releasedIds).not.toContain(freshUpsert.id)

    const { data: expiredRow } = await staffClient.from(TABLE).select('status, claimed_at').eq('id', expiredUpsert.id).single()
    expect(expiredRow?.status).toBe('pending')
    expect(expiredRow?.claimed_at).toBeNull()

    const { data: freshRow } = await staffClient.from(TABLE).select('status').eq('id', freshUpsert.id).single()
    expect(freshRow?.status).toBe('claimed')

    await repo.cancelPending(expiredUpsert.appointmentId)
  })

  it('dos reclamos simultáneos nunca reclaman la misma fila dos veces (FOR UPDATE SKIP LOCKED)', async () => {
    const upserts = Array.from({ length: 6 }, () => newUpsert({ sendAt: new Date('2030-01-01T00:00:00Z') }))
    for (const upsert of upserts) {
      track(upsert.id)
      await repo.insertIfAbsent(upsert)
    }
    const now = new Date('2042-06-15T00:00:00Z')

    const [first, second] = await Promise.all([repo.claimDuePending(now), repo.claimDuePending(now)])
    expect(isOk(first)).toBe(true)
    expect(isOk(second)).toBe(true)
    if (!isOk(first) || !isOk(second)) return

    const firstIds = first.value.map((reminder) => reminder.id)
    const secondIds = second.value.map((reminder) => reminder.id)
    const overlap = firstIds.filter((id) => secondIds.includes(id))
    expect(overlap).toHaveLength(0)

    const upsertIds = upserts.map((upsert) => upsert.id)
    const claimedFromOurs = [...firstIds, ...secondIds].filter((id) => upsertIds.includes(id))
    expect(new Set(claimedFromOurs).size).toBe(upsertIds.length)
    expect(claimedFromOurs).toHaveLength(upsertIds.length)
  })

  it('releaseToPending vuelve a pending una fila claimed y limpia claimed_at', async () => {
    const upsert = newUpsert({ sendAt: new Date('2030-01-01T00:00:00Z') })
    track(upsert.id)
    await repo.insertIfAbsent(upsert)
    await repo.claimDuePending(new Date('2042-06-15T00:00:00Z'))

    const released = await repo.releaseToPending(upsert.id)
    expect(isOk(released)).toBe(true)

    const { data } = await staffClient.from(TABLE).select('status, claimed_at').eq('id', upsert.id).single()
    expect(data?.status).toBe('pending')
    expect(data?.claimed_at).toBeNull()
  })

  it('markSent, markRetry y markExhausted solo escriben sobre una fila claimed', async () => {
    const neverClaimedUpsert = newUpsert()
    track(neverClaimedUpsert.id)
    await repo.insertIfAbsent(neverClaimedUpsert)

    const sentOnPending = await repo.markSent(neverClaimedUpsert.id, 'whatsapp', new Date('2042-01-01T00:00:00Z'))
    expect(isOk(sentOnPending)).toBe(true)
    const { data: untouched } = await staffClient.from(TABLE).select('status').eq('id', neverClaimedUpsert.id).single()
    expect(untouched?.status).toBe('pending')

    const claimableUpsert = newUpsert({ sendAt: new Date('2030-01-01T00:00:00Z') })
    track(claimableUpsert.id)
    await repo.insertIfAbsent(claimableUpsert)
    await repo.claimDuePending(new Date('2042-06-15T00:00:00Z'))

    const sent = await repo.markSent(claimableUpsert.id, 'whatsapp', new Date('2042-06-15T00:05:00Z'))
    expect(isOk(sent)).toBe(true)
    const { data: markedSent } = await staffClient.from(TABLE).select('status, last_channel').eq('id', claimableUpsert.id).single()
    expect(markedSent?.status).toBe('sent')
    expect(markedSent?.last_channel).toBe('whatsapp')
  })

  it('markRetry libera a pending con el intento y el error, y markExhausted deja failed', async () => {
    const retryUpsert = newUpsert({ sendAt: new Date('2030-01-01T00:00:00Z') })
    track(retryUpsert.id)
    await repo.insertIfAbsent(retryUpsert)
    await repo.claimDuePending(new Date('2042-06-15T00:00:00Z'))

    const retried = await repo.markRetry(retryUpsert.id, 1, 'fallo simulado')
    expect(isOk(retried)).toBe(true)
    const { data: retriedRow } = await staffClient.from(TABLE).select('status, attempts, last_error').eq('id', retryUpsert.id).single()
    expect(retriedRow?.status).toBe('pending')
    expect(retriedRow?.attempts).toBe(1)
    expect(retriedRow?.last_error).toBe('fallo simulado')

    const exhaustedUpsert = newUpsert({ sendAt: new Date('2030-01-01T00:00:00Z') })
    track(exhaustedUpsert.id)
    await repo.insertIfAbsent(exhaustedUpsert)
    await repo.claimDuePending(new Date('2042-06-15T00:00:00Z'))
    const exhausted = await repo.markExhausted(exhaustedUpsert.id, 5, 'fallo final')
    expect(isOk(exhausted)).toBe(true)
    const { data: exhaustedRow } = await staffClient.from(TABLE).select('status, attempts').eq('id', exhaustedUpsert.id).single()
    expect(exhaustedRow?.status).toBe('failed')
    expect(exhaustedRow?.attempts).toBe(5)
  })

  it('anon no puede leer ni escribir notifications_reminders (SEC-002, fail-closed)', async () => {
    const anonClient = createClient(API_URL, ANON_KEY, NO_PERSIST_OPTIONS)
    const upsert = newUpsert()
    track(upsert.id)
    await repo.insertIfAbsent(upsert)

    const { data, error } = await anonClient.from(TABLE).select('id').eq('id', upsert.id)
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)

    const insertAttempt = await anonClient.from(TABLE).insert({
      id: crypto.randomUUID(), appointment_id: crypto.randomUUID(), client_id: crypto.randomUUID(),
      starts_at: new Date().toISOString(), technique_name: 'intento anon', send_at: new Date().toISOString(),
    })
    expect(insertAttempt.error).not.toBeNull()
  })
})
