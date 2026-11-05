import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { clientNoticeDeliveryRepository } from '../client-notice-delivery-repository'
import { CLIENT_NOTICES_TABLE } from '../client-notice-repository'
import type { ClientNoticeDeliveryRepository } from '../../application/ports'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']
const STAFF_ROLE = 'admin'
const SETUP_TIMEOUT_MS = 60_000
const NO_PERSIST_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } }
const NOW = fixedDate('2047-10-01T12:00:00Z')
const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
const FIRST_KEPT_START_MS = Date.UTC(2047, 9, 7, 15)
const DAY_MS = 24 * 60 * 60 * 1000
const APPOINTMENT_MINUTES = 60
const PHONE_PREFIX = '+5068888'

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
  console.warn('[notifications/db] Supabase local no disponible — pruebas de integración del envío de avisos omitidas.')
}

describe.skipIf(!reachable)('clientNoticeDeliveryRepository (Supabase local)', () => {
  let admin: PgClient
  let staffUserId: string
  let repo: ClientNoticeDeliveryRepository
  let clientProfileId: string
  let seededAppointments = 0
  const seededIds: string[] = []
  const appointmentIds: string[] = []

  const seedAppointment = async (appointmentStatus: 'approved' | 'cancelled'): Promise<{ id: string; startsAt: string }> => {
    const startsAt = new Date(FIRST_KEPT_START_MS + seededAppointments * DAY_MS)
    seededAppointments += 1
    const endsAt = new Date(startsAt.getTime() + APPOINTMENT_MINUTES * 60_000)
    const inserted = await admin.query(
      `INSERT INTO public.scheduling_appointments
         (resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
          is_first_time, service_price, deposit_required, deposit_registered)
       VALUES ($1, $2, $3, $4, tstzrange($3::timestamptz, $4::timestamptz + interval '15 minutes'), $5, gen_random_uuid(),
               'Lifting', true, 35000, 10000, 0)
       RETURNING id`,
      [STUDIO_RESOURCE_ID, appointmentStatus, startsAt.toISOString(), endsAt.toISOString(), clientProfileId],
    )
    appointmentIds.push(inserted.rows[0].id)
    return { id: inserted.rows[0].id, startsAt: startsAt.toISOString() }
  }

  const seed = async (status: 'pending' | 'sent', appointmentStatus: 'approved' | 'cancelled' = 'approved'): Promise<string> => {
    const id = crypto.randomUUID()
    seededIds.push(id)
    const appointment = await seedAppointment(appointmentStatus)
    await admin.query(
      `INSERT INTO public.${CLIENT_NOTICES_TABLE}
         (id, kind, event_id, appointment_id, client_id, service_name, requested_starts_at, kept_starts_at, status)
       VALUES ($1, 'reschedule_rejected', gen_random_uuid(), $2, $3, 'Lifting', $4::timestamptz + interval '7 days', $4, $5)`,
      [id, appointment.id, clientProfileId, appointment.startsAt, status],
    )
    return id
  }

  const rowOf = async (id: string) =>
    (await admin.query(`SELECT status, attempts, last_error, last_channel FROM public.${CLIENT_NOTICES_TABLE} WHERE id = $1`, [id]))
      .rows[0]

  const claimedIds = async (): Promise<string[]> => {
    const claimed = await repo.claimDue(NOW)
    expect(isOk(claimed)).toBe(true)
    return isOk(claimed) ? claimed.value.map((delivery) => delivery.id).filter((id) => seededIds.includes(id)) : []
  }

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()

    const anon = createClient(API_URL, ANON_KEY, NO_PERSIST_OPTIONS)
    const email = `notifications-avisos-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
    const { data, error } = await anon.auth.signUp({ email, password: `pw-${Math.random().toString(36).slice(2)}` })
    if (error || !data.session || !data.user) {
      throw new Error(`no se pudo crear la usuaria de prueba: ${error?.message ?? 'sin sesión'}`)
    }
    staffUserId = data.user.id
    const staffClient: SupabaseClient = createClient(API_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
      ...NO_PERSIST_OPTIONS,
    })
    await admin.query('UPDATE public.auth_user_roles SET role = $1 WHERE user_id = $2', [STAFF_ROLE, staffUserId])
    const profile = await admin.query(
      'INSERT INTO public.clients_profiles (user_id, full_name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [staffUserId, 'Clienta de prueba', email, `${PHONE_PREFIX}${String(Date.now()).slice(-4)}`],
    )
    clientProfileId = profile.rows[0].id
    repo = clientNoticeDeliveryRepository(staffClient)
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!admin) return
    if (seededIds.length > 0) await admin.query(`DELETE FROM public.${CLIENT_NOTICES_TABLE} WHERE id = ANY($1::uuid[])`, [seededIds])
    if (appointmentIds.length > 0) {
      await admin.query('DELETE FROM public.notifications_admin_inbox WHERE appointment_id = ANY($1::uuid[])', [appointmentIds])
      await admin.query('DELETE FROM public.scheduling_appointments WHERE id = ANY($1::uuid[])', [appointmentIds])
    }
    if (clientProfileId) await admin.query('DELETE FROM public.clients_profiles WHERE id = $1', [clientProfileId])
    if (staffUserId) await admin.query('DELETE FROM auth.users WHERE id = $1', [staffUserId])
    await admin.end()
  })

  it('reclama los avisos pendientes, no los enviados, y marca el envío con su canal', async () => {
    const pending = await seed('pending')
    const sent = await seed('sent')

    expect(await claimedIds()).toEqual([pending])
    expect((await rowOf(sent)).status).toBe('sent')

    expect(isOk(await repo.markSent(pending, 'whatsapp', NOW))).toBe(true)
    expect(await rowOf(pending)).toMatchObject({ status: 'sent', last_channel: 'whatsapp' })
  })

  it('no reclama el aviso de una cita que ya no está viva', async () => {
    const cancelled = await seed('pending', 'cancelled')
    const live = await seed('pending')

    expect(await claimedIds()).toEqual([live])
    expect((await rowOf(cancelled)).status).toBe('pending')
  })

  it('un fallo vuelve a pendiente con el intento contado, y agotado queda failed con el motivo', async () => {
    const id = await seed('pending')

    expect(await claimedIds()).toEqual([id])
    await repo.markRetry(id, 1, 'WhatsApp no respondió')
    expect(await rowOf(id)).toMatchObject({ status: 'pending', attempts: 1, last_error: 'WhatsApp no respondió' })

    expect(await claimedIds()).toEqual([id])
    await repo.markExhausted(id, 5, 'sin canal configurado')
    expect(await rowOf(id)).toMatchObject({ status: 'failed', attempts: 5, last_error: 'sin canal configurado' })
    expect(await claimedIds()).toEqual([])
  })

  it('soltar un reclamo lo devuelve a pendiente para la corrida siguiente', async () => {
    const id = await seed('pending')

    expect(await claimedIds()).toEqual([id])
    await repo.releaseToPending(id)
    expect((await rowOf(id)).status).toBe('pending')
    expect(await claimedIds()).toEqual([id])
  })
})
