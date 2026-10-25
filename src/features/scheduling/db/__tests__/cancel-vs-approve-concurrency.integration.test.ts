import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseAppointmentDecisionRepository } from '../appointment-decision-repository'
import { createSupabaseCancellationRepository } from '../cancellation-repository'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
const SETUP_TIMEOUT_MS = 60_000
const ROUND_TIMEOUT_MS = 30_000
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } }
const CLIENT_EMAIL = 'cancel-race-client@lashary.test'
const ADMIN_EMAIL = 'cancel-race-admin@lashary.test'
const PASSWORD_KEY_SUFFIX_LENGTH = 16
const TEST_PASSWORD = `pw-${ANON_KEY.slice(-PASSWORD_KEY_SUFFIX_LENGTH)}`
const CLIENT_PHONE = '+50688990099'
const ADMIN_ROLE = 'admin'
const TECHNIQUE_NAME = 'zz-test cancelar contra aprobar'
const MS_PER_HOUR = 3_600_000
const FIRST_SLOT_HOURS_AHEAD = 4
const HOURS_BETWEEN_SLOTS = 3
const SERVICE_PRICE = 35_000
const DEPOSIT = 10_000
const SAW_NO_LOSS = 0
const ROUNDS = 12

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
  console.warn('[scheduling/db] Supabase local no disponible — prueba de cancelar contra aprobar omitida.')
}

describe.skipIf(!reachable)('cancelar y aprobar la misma cita a la vez (Supabase local)', () => {
  let pg: PgClient
  let clientDb: SupabaseClient
  let adminDb: SupabaseClient
  let profileId: string
  let slotIndex = 0

  async function sessionFor(email: string): Promise<{ db: SupabaseClient; userId: string }> {
    const anon = createClient(API_URL, ANON_KEY, CLIENT_OPTIONS)
    const signedIn = await anon.auth.signInWithPassword({ email, password: TEST_PASSWORD })
    const result = signedIn.error ? await anon.auth.signUp({ email, password: TEST_PASSWORD }) : signedIn
    const { session, user } = result.data
    if (result.error || !session || !user) {
      throw new Error(`no se pudo crear el usuario de prueba: ${result.error?.message ?? 'sin sesión'}`)
    }
    const db = createClient(API_URL, ANON_KEY, {
      ...CLIENT_OPTIONS,
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    })
    return { db, userId: user.id }
  }

  async function insertPendingAppointment(): Promise<string> {
    const startsAtMs = Date.now() + (FIRST_SLOT_HOURS_AHEAD + slotIndex * HOURS_BETWEEN_SLOTS) * MS_PER_HOUR
    slotIndex += 1
    const startsAt = new Date(startsAtMs).toISOString()
    const endsAt = new Date(startsAtMs + MS_PER_HOUR).toISOString()
    const inserted = await pg.query(
      `INSERT INTO public.scheduling_appointments
         (resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
          is_first_time, service_price, deposit_required, deposit_registered)
       VALUES ($1, 'pending_approval', $2, $3, tstzrange($2, $3), $4, gen_random_uuid(), $5, true, $6, $7, $7)
       RETURNING id`,
      [STUDIO_RESOURCE_ID, startsAt, endsAt, profileId, TECHNIQUE_NAME, SERVICE_PRICE, DEPOSIT],
    )
    return inserted.rows[0].id
  }

  const cancelAsClient = (appointmentId: string) =>
    createSupabaseCancellationRepository(clientDb).cancel(appointmentId, SAW_NO_LOSS)
  const approveAsAdmin = (appointmentId: string) =>
    createSupabaseAppointmentDecisionRepository(adminDb).decide({ appointmentId, decision: 'approved', reason: null })

  async function statusOf(appointmentId: string): Promise<string> {
    const { rows } = await pg.query('SELECT status FROM public.scheduling_appointments WHERE id = $1', [appointmentId])
    return rows[0].status
  }

  async function cancellationEvents(appointmentId: string) {
    const { rows } = await pg.query(
      "SELECT payload FROM public.audit_events WHERE entity_id = $1 AND action = 'scheduling.appointment.cancelled'",
      [appointmentId],
    )
    return rows.map((row) => row.payload as { previousStatus: string; forfeitedDeposit: number })
  }

  beforeAll(async () => {
    pg = new PgClient({ connectionString: DB_URL })
    await pg.connect()
    const client = await sessionFor(CLIENT_EMAIL)
    clientDb = client.db
    const admin = await sessionFor(ADMIN_EMAIL)
    adminDb = admin.db
    await pg.query('UPDATE public.auth_user_roles SET role = $1 WHERE user_id = $2', [ADMIN_ROLE, admin.userId])
    const found = await pg.query('SELECT id FROM public.clients_profiles WHERE user_id = $1', [client.userId])
    profileId = found.rows.length
      ? found.rows[0].id
      : (
          await pg.query(
            'INSERT INTO public.clients_profiles (user_id, full_name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id',
            [client.userId, 'Clienta concurrencia', CLIENT_EMAIL, CLIENT_PHONE],
          )
        ).rows[0].id
    await pg.query('DELETE FROM public.scheduling_appointments WHERE client_id = $1', [profileId])
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!pg) return
    await pg.query('DELETE FROM public.scheduling_appointments WHERE client_id = $1', [profileId])
    await pg.end()
  })

  it('si la aprobación gana, la clienta que vio «sin pérdida» no cancela: la consecuencia cambió', async () => {
    const appointmentId = await insertPendingAppointment()

    expect(isOk(await approveAsAdmin(appointmentId))).toBe(true)
    const cancelled = await cancelAsClient(appointmentId)

    expect(isErr(cancelled) && cancelled.error.code).toBe('SCHEDULING_CANCELLATION_CONSEQUENCE_CHANGED')
    expect(await statusOf(appointmentId)).toBe('approved')
    expect(await cancellationEvents(appointmentId)).toEqual([])
  })

  it('si la cancelación gana, la aprobación ya no encuentra una cita pendiente', async () => {
    const appointmentId = await insertPendingAppointment()

    expect(isOk(await cancelAsClient(appointmentId))).toBe(true)
    const approved = await approveAsAdmin(appointmentId)

    expect(isErr(approved) && approved.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_PENDING')
    expect(await statusOf(appointmentId)).toBe('cancelled')
  })

  it(
    'a la vez, nunca ganan las dos: la cita queda aprobada o cancelada, y el evento coincide con lo que pasó',
    async () => {
      for (let round = 0; round < ROUNDS; round += 1) {
        const appointmentId = await insertPendingAppointment()

        const [cancelled, approved] = await Promise.all([cancelAsClient(appointmentId), approveAsAdmin(appointmentId)])
        const finalStatus = await statusOf(appointmentId)
        const events = await cancellationEvents(appointmentId)

        expect(isOk(cancelled) && isOk(approved)).toBe(false)
        if (finalStatus === 'cancelled') {
          expect(isOk(cancelled)).toBe(true)
          expect(isErr(approved) && approved.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_PENDING')
          expect(events).toHaveLength(1)
          expect(events[0]).toMatchObject({ previousStatus: 'pending_approval', forfeitedDeposit: 0 })
        } else {
          expect(finalStatus).toBe('approved')
          expect(isOk(approved)).toBe(true)
          expect(isErr(cancelled) && cancelled.error.code).toBe('SCHEDULING_CANCELLATION_CONSEQUENCE_CHANGED')
          expect(events).toEqual([])
        }
      }
    },
    ROUND_TIMEOUT_MS * ROUNDS,
  )
})
