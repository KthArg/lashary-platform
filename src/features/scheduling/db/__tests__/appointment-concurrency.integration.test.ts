import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isErr, isOk } from '@/shared/result'
import { createAppointment } from '../../application/create-appointment'
import {
  createSupabaseAppointmentRepository,
  type OverlapRejectedEvent,
} from '../appointment-repository'


const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const APPOINTMENTS_TABLE = 'scheduling_appointments'
const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
const CONCURRENT_BOOKINGS = 10
const ROUNDS = 3
const SERVICE_DURATION_MIN = 60
const PREP_MIN = 15
const CLEANUP_MIN = 10
const STAFF_ROLE = 'admin'
const FIRST_TEST_DAY_MS = Date.parse('2041-01-01T10:00:00Z')
const MS_PER_DAY = 86_400_000
const TEST_DAYS_SPREAD = 300
const CONCURRENCY_ROUND_TIMEOUT_MS = 10_000

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
    const res = await fetch(`${API_URL}/rest/v1/`, { headers: { apikey: ANON_KEY } })
    if (res.status >= 500) return false
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
  console.warn('[scheduling/db] Supabase local no disponible — prueba de concurrencia omitida.')
}

describe.skipIf(!reachable)('US-AGE-09 criterio 4 — N reservas simultáneas (Supabase local)', () => {
  let staffClient: SupabaseClient
  let staffUserId: string
  let admin: PgClient
  const usedStartsMs: number[] = []

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()

    const anon = createClient(API_URL, ANON_KEY)
    const email = `concurrency-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
    const { data, error } = await anon.auth.signUp({
      email,
      password: `pw-${Math.random().toString(36).slice(2)}`,
    })
    if (error || !data.session || !data.user) {
      throw new Error(`no se pudo crear la usuaria de prueba: ${error?.message ?? 'sin sesión'}`)
    }
    staffUserId = data.user.id
    staffClient = createClient(API_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    })

    await admin.query('UPDATE public.auth_user_roles SET role = $1 WHERE user_id = $2', [
      STAFF_ROLE,
      staffUserId,
    ])
  })

  afterAll(async () => {
    if (!admin) return
    await admin.query(
      'DELETE FROM public.scheduling_appointments WHERE resource_id = $1 AND starts_at = ANY($2::timestamptz[])',
      [STUDIO_RESOURCE_ID, usedStartsMs.map((startsMs) => new Date(startsMs).toISOString())],
    )
    if (staffUserId) await admin.query('DELETE FROM auth.users WHERE id = $1', [staffUserId])
    await admin.end()
  })

  const newTestStartMs = (): number => {
    const dayOffset = Math.floor(Math.random() * TEST_DAYS_SPREAD)
    const startsAtMs = FIRST_TEST_DAY_MS + dayOffset * MS_PER_DAY
    usedStartsMs.push(startsAtMs)
    return startsAtMs
  }

  it.each(Array.from({ length: ROUNDS }, (_, index) => index + 1))(
    'ronda %i: exactamente una reserva gana y el resto recibe espacio no disponible',
    async () => {
      const startsAtMs = newTestStartMs()
      const reported: OverlapRejectedEvent[] = []
      const repository = createSupabaseAppointmentRepository(staffClient, (event) =>
        reported.push(event),
      )

      const results = await Promise.all(
        Array.from({ length: CONCURRENT_BOOKINGS }, () =>
          createAppointment(repository, {
            resourceId: STUDIO_RESOURCE_ID,
            startsAtMs,
            serviceDurationMin: SERVICE_DURATION_MIN,
            prepMin: PREP_MIN,
            cleanupMin: CLEANUP_MIN,
          }),
        ),
      )

      const winners = results.filter(isOk)
      const losers = results.filter(isErr)
      expect(winners).toHaveLength(1)
      expect(losers).toHaveLength(CONCURRENT_BOOKINGS - 1)
      for (const loser of losers) {
        expect(loser.error.code).toBe('SCHEDULING_SPACE_NOT_AVAILABLE')
      }

      expect(reported).toHaveLength(CONCURRENT_BOOKINGS - 1)

      const { count, error } = await staffClient
        .from(APPOINTMENTS_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('resource_id', STUDIO_RESOURCE_ID)
        .eq('starts_at', new Date(startsAtMs).toISOString())
      expect(error).toBeNull()
      expect(count).toBe(1)
    },
    CONCURRENCY_ROUND_TIMEOUT_MS,
  )
})
