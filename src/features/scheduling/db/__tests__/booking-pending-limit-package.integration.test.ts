import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isErr, isOk } from '@/shared/result'
import { bookPackageAppointment } from '../../application/book-package-appointment'
import { noDelinquencyYet } from '../../application/no-delinquency'
import { MS_PER_MINUTE } from '../../domain/appointment-window.constants'
import { createSupabasePackageBookingRepository } from '../package-booking-repository'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
const SEEDED_PACKAGE_NAME = 'Cejas y pestañas clásico'
const MONDAY_ISO_WEEKDAY = 1
const OPEN_FROM_MIN = 120
const FIRST_MONDAY_OPENING_MS = Date.parse('2046-01-01T08:00:00Z')
const MS_PER_WEEK = 7 * 24 * 60 * MS_PER_MINUTE
const RUN_OFFSET_WEEKS_SPREAD = 40
const SLOT_INTERVAL_MIN = 30
const EXTRA_ATTEMPTS_OVER_LIMIT = 3
const ROUNDS = 3
const ROUND_TIMEOUT_MS = 20_000
const SETUP_TIMEOUT_MS = 60_000
const TEST_PHONE = '+50680008888'

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
  console.warn('[scheduling/db] Supabase local no disponible — prueba del tope de pendientes con paquete omitida.')
}

describe.skipIf(!reachable)('US-AGE-04 tope de pendientes con un paquete — una clienta reservando varios espacios a la vez (Supabase local)', () => {
  let admin: PgClient
  let userId = ''
  let weeklyBlockId = ''
  let packageId = ''
  let slotStepMs = 0
  let pendingLimit = 0
  let repository: ReturnType<typeof createSupabasePackageBookingRepository>
  const runOffsetWeeks = Math.floor(Math.random() * RUN_OFFSET_WEEKS_SPREAD)

  const deleteAppointments = () =>
    admin.query(
      'DELETE FROM public.scheduling_appointments WHERE client_id IN (SELECT id FROM public.clients_profiles WHERE user_id = $1)',
      [userId],
    )

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()

    const anon = createClient(API_URL, ANON_KEY)
    const { data, error } = await anon.auth.signUp({
      email: `pending-limit-package-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`,
      password: `pw-${Math.random().toString(36).slice(2)}`,
    })
    if (error || !data.session || !data.user) {
      throw new Error(`no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`)
    }
    userId = data.user.id
    await admin.query(
      'INSERT INTO public.clients_profiles (user_id, full_name, email, phone) VALUES ($1, $2, $3, $4)',
      [userId, 'Clienta con tope de paquete', `pending-limit-package-${userId}@lashary.test`, TEST_PHONE],
    )
    const session = createClient(API_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    })
    repository = createSupabasePackageBookingRepository(session)

    const seededPackage = await admin.query(
      'SELECT id FROM public.catalog_packages WHERE name = $1 AND is_active',
      [SEEDED_PACKAGE_NAME],
    )
    if (seededPackage.rows.length === 0) throw new Error(`no está sembrado el paquete «${SEEDED_PACKAGE_NAME}»`)
    packageId = seededPackage.rows[0].id

    const terms = await admin.query(
      'SELECT sum(duration_min)::int AS duration_min, sum(buffer_min)::int AS buffer_min FROM public.catalog_package_booking_terms($1)',
      [packageId],
    )
    const occupiedMin = terms.rows[0].duration_min + terms.rows[0].buffer_min
    const slotStepMin = Math.ceil(occupiedMin / SLOT_INTERVAL_MIN) * SLOT_INTERVAL_MIN
    slotStepMs = slotStepMin * MS_PER_MINUTE

    const limit = await admin.query('SELECT max_pending_per_client FROM public.scheduling_booking_limits')
    pendingLimit = limit.rows[0].max_pending_per_client

    const attempts = pendingLimit + EXTRA_ATTEMPTS_OVER_LIMIT
    const block = await admin.query(
      `INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [STUDIO_RESOURCE_ID, MONDAY_ISO_WEEKDAY, OPEN_FROM_MIN, OPEN_FROM_MIN + attempts * slotStepMin],
    )
    weeklyBlockId = block.rows[0].id
  }, SETUP_TIMEOUT_MS)

  beforeEach(async () => {
    if (userId) await deleteAppointments()
  })

  afterAll(async () => {
    if (!admin) return
    if (userId) await deleteAppointments()
    if (weeklyBlockId) await admin.query('DELETE FROM public.scheduling_weekly_availability WHERE id = $1', [weeklyBlockId])
    if (userId) await admin.query('DELETE FROM auth.users WHERE id = $1', [userId])
    await admin.end()
  })

  it.each(Array.from({ length: ROUNDS }, (_, index) => index))(
    'ronda %i: una cita de paquete cuenta para el mismo tope de pendientes que una de técnica',
    async (round) => {
      const firstStartMs = FIRST_MONDAY_OPENING_MS + (runOffsetWeeks + round) * MS_PER_WEEK
      const attempts = pendingLimit + EXTRA_ATTEMPTS_OVER_LIMIT

      const results = await Promise.all(
        Array.from({ length: attempts }, (_, slot) =>
          bookPackageAppointment({ bookings: repository, delinquency: noDelinquencyYet })({
            resourceId: STUDIO_RESOURCE_ID,
            startsAtMs: firstStartMs + slot * slotStepMs,
            packageId,
          }),
        ),
      )

      expect(results.filter(isOk)).toHaveLength(pendingLimit)
      const rejected = results.filter(isErr)
      expect(rejected).toHaveLength(EXTRA_ATTEMPTS_OVER_LIMIT)
      for (const failure of rejected) expect(failure.error.code).toBe('SCHEDULING_TOO_MANY_PENDING_APPOINTMENTS')

      const stored = await admin.query(
        `SELECT count(*)::int AS total FROM public.scheduling_appointments
          WHERE client_id IN (SELECT id FROM public.clients_profiles WHERE user_id = $1) AND status = 'pending_approval'`,
        [userId],
      )
      expect(stored.rows[0].total).toBe(pendingLimit)
    },
    ROUND_TIMEOUT_MS,
  )
})
