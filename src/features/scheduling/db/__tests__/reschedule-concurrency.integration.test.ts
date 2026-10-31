import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseAppointmentDecisionRepository } from '../appointment-decision-repository'
import { createSupabaseRescheduleRepository } from '../reschedule-repository'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
const SETUP_TIMEOUT_MS = 60_000
const ROUND_TIMEOUT_MS = 30_000
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } }
const FIRST_CLIENT_EMAIL = 'resched-race-a@lashary.test'
const SECOND_CLIENT_EMAIL = 'resched-race-b@lashary.test'
const ADMIN_EMAIL = 'resched-race-admin@lashary.test'
const PASSWORD_KEY_SUFFIX_LENGTH = 16
const TEST_PASSWORD = `pw-${ANON_KEY.slice(-PASSWORD_KEY_SUFFIX_LENGTH)}`
const FIRST_CLIENT_PHONE = '+50688990101'
const SECOND_CLIENT_PHONE = '+50688990102'
const ADMIN_ROLE = 'admin'
const TECHNIQUE_NAME = 'zz-test reagendar a la vez'
const FRIDAY_ISO_WEEKDAY = 5
const OPEN_FROM_MIN = 540
const OPEN_UNTIL_MIN = 1020
const FIRST_FRIDAY_9AM_MS = Date.parse('2043-01-02T15:00:00Z')
const MS_PER_HOUR = 3_600_000
const MS_PER_WEEK = 7 * 24 * MS_PER_HOUR
const SERVICE_HOURS = 1
const BUFFER_MINUTES = 15
const MS_PER_MINUTE = 60_000
const OLD_SLOT_OFFSET_HOURS = 0
const NEW_SLOT_OFFSET_HOURS = 2
const OTHER_NEW_SLOT_OFFSET_HOURS = 4
const SERVICE_PRICE = 35_000
const DEPOSIT = 10_000
const RESCHEDULE_LIMIT = 1
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
  console.warn('[scheduling/db] Supabase local no disponible — prueba de reagendar a la vez omitida.')
}

type Session = { db: SupabaseClient; userId: string; profileId: string }
type StoredAppointment = { status: string; starts_at: Date; reschedule_count: number }

describe.skipIf(!reachable)('reagendar a la vez (Supabase local)', () => {
  let pg: PgClient
  let first: Session
  let second: Session
  let adminDb: SupabaseClient
  let weeklyBlockId: string
  let previousLimit: number
  let roundIndex = 0

  async function signedInDb(email: string): Promise<{ db: SupabaseClient; userId: string }> {
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

  async function clientSession(email: string, phone: string): Promise<Session> {
    const { db, userId } = await signedInDb(email)
    const found = await pg.query('SELECT id FROM public.clients_profiles WHERE user_id = $1', [userId])
    const profileId: string = found.rows.length
      ? found.rows[0].id
      : (
          await pg.query(
            'INSERT INTO public.clients_profiles (user_id, full_name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, 'Clienta reagendar', email, phone],
          )
        ).rows[0].id
    return { db, userId, profileId }
  }

  const slotMs = (fridayStartMs: number, offsetHours: number) => fridayStartMs + offsetHours * MS_PER_HOUR

  async function insertPendingAppointment(profileId: string, startsAtMs: number): Promise<string> {
    const endsAtMs = startsAtMs + SERVICE_HOURS * MS_PER_HOUR
    const occupiedUntilMs = endsAtMs + BUFFER_MINUTES * MS_PER_MINUTE
    const inserted = await pg.query(
      `INSERT INTO public.scheduling_appointments
         (resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
          is_first_time, service_price, deposit_required, deposit_registered)
       VALUES ($1, 'pending_approval', $2, $3, tstzrange($2, $4), $5, gen_random_uuid(), $6, true, $7, $8, $8)
       RETURNING id`,
      [
        STUDIO_RESOURCE_ID,
        new Date(startsAtMs).toISOString(),
        new Date(endsAtMs).toISOString(),
        new Date(occupiedUntilMs).toISOString(),
        profileId,
        TECHNIQUE_NAME,
        SERVICE_PRICE,
        DEPOSIT,
      ],
    )
    return inserted.rows[0].id
  }

  function nextFridayStartMs(): number {
    const start = FIRST_FRIDAY_9AM_MS + roundIndex * MS_PER_WEEK
    roundIndex += 1
    return start
  }

  const rescheduleAs = (session: Session, appointmentId: string, newStartsAtMs: number) =>
    createSupabaseRescheduleRepository(session.db).reschedule({
      appointmentId,
      newStartsAtMs,
      expectedStatus: 'pending_approval',
    })
  const approveAsAdmin = (appointmentId: string, seenStartsAtMs: number) =>
    createSupabaseAppointmentDecisionRepository(adminDb).decide({
      appointmentId,
      decision: 'approved',
      reason: null,
      expectedStartsAtMs: seenStartsAtMs,
    })

  async function stored(appointmentId: string): Promise<StoredAppointment> {
    const { rows } = await pg.query(
      'SELECT status, starts_at, reschedule_count FROM public.scheduling_appointments WHERE id = $1',
      [appointmentId],
    )
    return rows[0]
  }

  async function rescheduleEvents(appointmentId: string): Promise<number> {
    const { rows } = await pg.query(
      "SELECT count(*)::int AS total FROM public.audit_events WHERE entity_id = $1 AND action = 'scheduling.appointment.rescheduled'",
      [appointmentId],
    )
    return rows[0].total
  }

  async function deleteTestAppointments() {
    await pg.query('DELETE FROM public.scheduling_appointments WHERE client_id = ANY($1)', [
      [first.profileId, second.profileId],
    ])
  }

  beforeAll(async () => {
    pg = new PgClient({ connectionString: DB_URL })
    await pg.connect()
    first = await clientSession(FIRST_CLIENT_EMAIL, FIRST_CLIENT_PHONE)
    second = await clientSession(SECOND_CLIENT_EMAIL, SECOND_CLIENT_PHONE)
    const admin = await signedInDb(ADMIN_EMAIL)
    adminDb = admin.db
    await pg.query('UPDATE public.auth_user_roles SET role = $1 WHERE user_id = $2', [ADMIN_ROLE, admin.userId])
    await deleteTestAppointments()

    const policy = await pg.query('SELECT max_reschedules FROM public.scheduling_reschedule_policy')
    previousLimit = policy.rows[0].max_reschedules
    await pg.query('UPDATE public.scheduling_reschedule_policy SET max_reschedules = $1', [RESCHEDULE_LIMIT])

    const block = await pg.query(
      `INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [STUDIO_RESOURCE_ID, FRIDAY_ISO_WEEKDAY, OPEN_FROM_MIN, OPEN_UNTIL_MIN],
    )
    weeklyBlockId = block.rows[0].id
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!pg) return
    if (first && second) await deleteTestAppointments()
    if (weeklyBlockId) await pg.query('DELETE FROM public.scheduling_weekly_availability WHERE id = $1', [weeklyBlockId])
    if (previousLimit !== undefined) {
      await pg.query('UPDATE public.scheduling_reschedule_policy SET max_reschedules = $1', [previousLimit])
    }
    await pg.end()
  })

  it(
    'dos clientas piden el mismo espacio a la vez: solo una lo toma y la otra se queda con su cita',
    async () => {
      for (let round = 0; round < ROUNDS; round += 1) {
        const friday = nextFridayStartMs()
        const target = slotMs(friday, NEW_SLOT_OFFSET_HOURS)
        const firstOld = slotMs(friday, OLD_SLOT_OFFSET_HOURS)
        const secondOld = slotMs(friday, OTHER_NEW_SLOT_OFFSET_HOURS)
        const firstId = await insertPendingAppointment(first.profileId, firstOld)
        const secondId = await insertPendingAppointment(second.profileId, secondOld)

        const [firstResult, secondResult] = await Promise.all([
          rescheduleAs(first, firstId, target),
          rescheduleAs(second, secondId, target),
        ])

        expect(isOk(firstResult) && isOk(secondResult)).toBe(false)
        const winnerId = isOk(firstResult) ? firstId : secondId
        const loserId = isOk(firstResult) ? secondId : firstId
        const loserResult = isOk(firstResult) ? secondResult : firstResult
        expect(isErr(loserResult) && loserResult.error.code).toBe('SCHEDULING_RESCHEDULE_SLOT_TAKEN')
        expect((await stored(winnerId)).starts_at.getTime()).toBe(target)
        expect((await stored(winnerId)).reschedule_count).toBe(1)
        expect(await rescheduleEvents(winnerId)).toBe(1)
        const loser = await stored(loserId)
        expect(loser.reschedule_count).toBe(0)
        expect(loser.starts_at.getTime()).toBe(isOk(firstResult) ? secondOld : firstOld)
        expect(await rescheduleEvents(loserId)).toBe(0)
      }
    },
    ROUND_TIMEOUT_MS * ROUNDS,
  )

  it(
    'la misma clienta confirma dos horarios a la vez: solo se cuenta un reagendado y la cita queda en uno solo',
    async () => {
      for (let round = 0; round < ROUNDS; round += 1) {
        const friday = nextFridayStartMs()
        const oldStart = slotMs(friday, OLD_SLOT_OFFSET_HOURS)
        const firstTarget = slotMs(friday, NEW_SLOT_OFFSET_HOURS)
        const secondTarget = slotMs(friday, OTHER_NEW_SLOT_OFFSET_HOURS)
        const appointmentId = await insertPendingAppointment(first.profileId, oldStart)

        const [toFirst, toSecond] = await Promise.all([
          rescheduleAs(first, appointmentId, firstTarget),
          rescheduleAs(first, appointmentId, secondTarget),
        ])

        expect(isOk(toFirst) && isOk(toSecond)).toBe(false)
        const loser = isOk(toFirst) ? toSecond : toFirst
        expect(isErr(loser) && loser.error.code).toBe('SCHEDULING_RESCHEDULE_LIMIT_REACHED')
        const final = await stored(appointmentId)
        expect(final.reschedule_count).toBe(1)
        expect(final.starts_at.getTime()).toBe(isOk(toFirst) ? firstTarget : secondTarget)
        expect(await rescheduleEvents(appointmentId)).toBe(1)
      }
    },
    ROUND_TIMEOUT_MS * ROUNDS,
  )

  it(
    'reagendar y aprobar a la vez: la aprobación nunca aprueba un horario que la administradora no vio',
    async () => {
      for (let round = 0; round < ROUNDS; round += 1) {
        const friday = nextFridayStartMs()
        const oldStart = slotMs(friday, OLD_SLOT_OFFSET_HOURS)
        const target = slotMs(friday, NEW_SLOT_OFFSET_HOURS)
        const appointmentId = await insertPendingAppointment(first.profileId, oldStart)

        const [rescheduled, approved] = await Promise.all([
          rescheduleAs(first, appointmentId, target),
          approveAsAdmin(appointmentId, oldStart),
        ])

        const final = await stored(appointmentId)
        expect(isOk(rescheduled) && isOk(approved)).toBe(false)
        expect(await rescheduleEvents(appointmentId)).toBe(final.reschedule_count)
        if (isOk(approved)) {
          expect(isErr(rescheduled) && rescheduled.error.code).toBe('SCHEDULING_RESCHEDULE_STATE_CHANGED')
          expect(final).toMatchObject({ status: 'approved', reschedule_count: 0 })
          expect(final.starts_at.getTime()).toBe(oldStart)
        } else {
          expect(isOk(rescheduled)).toBe(true)
          expect(isErr(approved) && approved.error).toMatchObject({
            code: 'SCHEDULING_APPOINTMENT_SCHEDULE_CHANGED',
            startsAtMs: target,
          })
          expect(final).toMatchObject({ status: 'pending_approval', reschedule_count: 1 })
          expect(final.starts_at.getTime()).toBe(target)
        }
      }
    },
    ROUND_TIMEOUT_MS * ROUNDS,
  )

  it('si la clienta ya reagendó, aprobar el horario viejo no aprueba nada y la cita sigue pendiente', async () => {
    const friday = nextFridayStartMs()
    const oldStart = slotMs(friday, OLD_SLOT_OFFSET_HOURS)
    const target = slotMs(friday, NEW_SLOT_OFFSET_HOURS)
    const appointmentId = await insertPendingAppointment(first.profileId, oldStart)

    expect(isOk(await rescheduleAs(first, appointmentId, target))).toBe(true)
    const approvedOldSchedule = await approveAsAdmin(appointmentId, oldStart)

    expect(isErr(approvedOldSchedule) && approvedOldSchedule.error.code).toBe('SCHEDULING_APPOINTMENT_SCHEDULE_CHANGED')
    expect((await stored(appointmentId)).status).toBe('pending_approval')
    expect(isOk(await approveAsAdmin(appointmentId, target))).toBe(true)
    expect((await stored(appointmentId)).status).toBe('approved')
  })
})
