import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isErr, isOk } from '@/shared/result'
import { systemClock } from '@/shared/clock'
import { studioDateOf } from '@/shared/studio-time'
import { bookAppointment } from '../../application/book-appointment'
import { blockSlots } from '../../application/manual-blocks'
import { noDelinquencyYet } from '../../application/no-delinquency'
import { isManualBlockHasAppointment } from '../../domain/availability-errors'
import { MS_PER_MINUTE } from '../../domain/appointment-window.constants'
import { createSupabaseBookingRepository } from '../booking-repository'
import { createSupabaseManualBlockRepository } from '../manual-block-repository'
import { createSupabaseDayAvailabilityRepository } from '../day-availability-repository'
import type { BookingRepository } from '../../application/ports'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
const CONCURRENT_CLIENTAS = 10
const ROUNDS = 3
const ROUND_TIMEOUT_MS = 20_000
const SETUP_TIMEOUT_MS = 60_000
const WEDNESDAY_ISO_WEEKDAY = 3
const OPEN_FROM_MIN = 120
const FIRST_WEDNESDAY_OPENING_MS = Date.parse('2045-01-04T08:00:00Z')
const MS_PER_WEEK = 7 * 24 * 60 * MS_PER_MINUTE
const RUN_OFFSET_WEEKS_SPREAD = 40
const SPARE_MINUTES_IN_BLOCK = 60
const TEST_PHONE_PREFIX = '+5068100'
const SPACE_NOT_AVAILABLE = 'SCHEDULING_SPACE_NOT_AVAILABLE'
const ACTIVE_STATUSES = ['pending_approval', 'approved', 'confirmed']

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
  console.warn('[scheduling/db] Supabase local no disponible — prueba de bloqueo contra reserva omitida.')
}

type SignedUpUser = { userId: string; client: SupabaseClient }
type Clienta = { userId: string; repository: BookingRepository }

async function signUp(emailPrefix: string, index: number): Promise<SignedUpUser> {
  const anon = createClient(API_URL, ANON_KEY)
  const { data, error } = await anon.auth.signUp({
    email: `${emailPrefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}@lashary.test`,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session || !data.user) {
    throw new Error(`no se pudo crear la cuenta de prueba: ${error?.message ?? 'sin sesión'}`)
  }
  const client = createClient(API_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  return { userId: data.user.id, client }
}

describe.skipIf(!reachable)('US-AGE-07 criterio 4 — la administradora bloquea mientras las clientas reservan el mismo espacio (Supabase local)', () => {
  let admin: PgClient
  let staff: SignedUpUser
  let techniqueId: string
  let weeklyBlockId: string
  let clientas: Clienta[] = []
  const createdBlockIds: string[] = []
  const runOffsetWeeks = Math.floor(Math.random() * RUN_OFFSET_WEEKS_SPREAD)

  // El trigger que impide quitar un bloque con citas cuenta por día y hora, no por fecha: una cita de otra
  // prueba en paralelo, de otro año, bastaría para rechazar el borrado. Sin triggers solo en esta transacción.
  const deleteWeeklyBlock = async () => {
    await admin.query('BEGIN')
    try {
      await admin.query('SET LOCAL session_replication_role = replica')
      await admin.query('DELETE FROM public.scheduling_weekly_availability WHERE id = $1', [weeklyBlockId])
      await admin.query('COMMIT')
    } catch (error) {
      await admin.query('ROLLBACK')
      throw error
    }
  }

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()

    staff = await signUp('block-concurrency-staff', 0)
    await admin.query(`UPDATE public.auth_user_roles SET role = 'admin' WHERE user_id = $1`, [staff.userId])

    const signedUpClientas = await Promise.all(
      Array.from({ length: CONCURRENT_CLIENTAS }, (_, index) => signUp('block-concurrency', index)),
    )
    for (const [index, clienta] of signedUpClientas.entries()) {
      await admin.query(
        'INSERT INTO public.clients_profiles (user_id, full_name, email, phone) VALUES ($1, $2, $3, $4)',
        [clienta.userId, `Clienta ${index}`, `block-concurrency-${clienta.userId}@lashary.test`, `${TEST_PHONE_PREFIX}${index}`],
      )
    }
    clientas = signedUpClientas.map((clienta) => ({
      userId: clienta.userId,
      repository: createSupabaseBookingRepository(clienta.client),
    }))

    const seeded = await admin.query(
      `SELECT id, duration_first_time_min, buffer_min
         FROM public.catalog_techniques WHERE is_active ORDER BY created_at, id LIMIT 1`,
    )
    if (seeded.rows.length === 0) throw new Error('no hay ninguna técnica activa sembrada en el catálogo')
    techniqueId = seeded.rows[0].id
    const occupiedMinutes = seeded.rows[0].duration_first_time_min + seeded.rows[0].buffer_min

    const block = await admin.query(
      `INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [STUDIO_RESOURCE_ID, WEDNESDAY_ISO_WEEKDAY, OPEN_FROM_MIN, OPEN_FROM_MIN + occupiedMinutes + SPARE_MINUTES_IN_BLOCK],
    )
    weeklyBlockId = block.rows[0].id
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!admin) return
    const userIds = clientas.map((clienta) => clienta.userId)
    if (userIds.length > 0) {
      await admin.query(
        'DELETE FROM public.scheduling_appointments WHERE client_id IN (SELECT id FROM public.clients_profiles WHERE user_id = ANY($1::uuid[]))',
        [userIds],
      )
    }
    if (createdBlockIds.length > 0) {
      await admin.query('DELETE FROM public.scheduling_manual_blocks WHERE id = ANY($1::uuid[])', [createdBlockIds])
    }
    if (weeklyBlockId) await deleteWeeklyBlock()
    const allUserIds = staff ? [...userIds, staff.userId] : userIds
    if (allUserIds.length > 0) await admin.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [allUserIds])
    await admin.end()
  })

  it.each(Array.from({ length: ROUNDS }, (_, index) => index))(
    'ronda %i: gana el bloqueo o una sola reserva, nunca los dos',
    async (round) => {
      const startsAtMs = FIRST_WEDNESDAY_OPENING_MS + (runOffsetWeeks + round) * MS_PER_WEEK
      const date = studioDateOf(new Date(startsAtMs))
      const openHours = await createSupabaseDayAvailabilityRepository(staff.client).listOpenHours(STUDIO_RESOURCE_ID, date)
      const blockOpeningSlot = blockSlots({
        repo: createSupabaseManualBlockRepository(staff.client),
        day: { listOpenHours: async () => openHours },
        newId: randomUUID,
        clock: systemClock,
      })

      const attemptBooking = (clienta: Clienta) =>
        bookAppointment({ bookings: clienta.repository, delinquency: noDelinquencyYet })({
          resourceId: STUDIO_RESOURCE_ID,
          startsAtMs,
          techniqueId,
          isFirstTime: true,
        })
      const half = Math.floor(clientas.length / 2)
      const bookingsBeforeBlock = clientas.slice(0, half).map(attemptBooking)
      const blockAttempt = blockOpeningSlot({
        resourceId: STUDIO_RESOURCE_ID,
        date,
        slotStartMinutes: [OPEN_FROM_MIN],
      })
      const bookingsAfterBlock = clientas.slice(half).map(attemptBooking)
      const [blockResult, ...bookingResults] = await Promise.all([
        blockAttempt,
        ...bookingsBeforeBlock,
        ...bookingsAfterBlock,
      ])

      const bookingWinners = bookingResults.filter(isOk)
      const bookingLosers = bookingResults.filter(isErr)
      for (const loser of bookingLosers) expect(loser.error.code).toBe(SPACE_NOT_AVAILABLE)

      if (isOk(blockResult)) {
        createdBlockIds.push(...blockResult.value.map((block) => block.id))
        expect(bookingWinners).toHaveLength(0)
      } else {
        expect(isManualBlockHasAppointment(blockResult.error)).toBe(true)
        expect(bookingWinners).toHaveLength(1)
      }

      const stored = await admin.query(
        `SELECT
           (SELECT count(*)::int FROM public.scheduling_appointments
             WHERE resource_id = $1 AND starts_at = $2 AND status = ANY($3::text[])) AS active_appointments,
           (SELECT count(*)::int FROM public.scheduling_manual_blocks
             WHERE resource_id = $1 AND starts_at = $2) AS manual_blocks`,
        [STUDIO_RESOURCE_ID, new Date(startsAtMs).toISOString(), ACTIVE_STATUSES],
      )
      expect(stored.rows[0].active_appointments + stored.rows[0].manual_blocks).toBe(1)
    },
    ROUND_TIMEOUT_MS,
  )
})
