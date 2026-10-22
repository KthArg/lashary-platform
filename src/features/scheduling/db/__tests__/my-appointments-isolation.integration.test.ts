import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseMyAppointmentsRepository } from '../my-appointments-repository'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
const SETUP_TIMEOUT_MS = 60_000
const TEST_PHONE_PREFIX = '+5068003'
const MS_PER_HOUR = 3_600_000
const FIRST_APPOINTMENT_MS = Date.parse('2044-03-07T15:00:00Z')
const SERVICE_DURATION_MS = MS_PER_HOUR
const GAP_BETWEEN_APPOINTMENTS_MS = 3 * MS_PER_HOUR
const NOW_MS = Date.parse('2044-01-01T00:00:00Z')
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } }

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
  console.warn('[scheduling/db] Supabase local no disponible — prueba de aislamiento de «mis citas» omitida.')
}

type Clienta = { userId: string; profileId: string; appointmentId: string; db: SupabaseClient }

describe.skipIf(!reachable)('«mis citas» solo devuelve las citas de la clienta de la sesión (Supabase local)', () => {
  let admin: PgClient
  const clientas: Clienta[] = []

  async function createClienta(index: number): Promise<Clienta> {
    const anon = createClient(API_URL, ANON_KEY, CLIENT_OPTIONS)
    const { data, error } = await anon.auth.signUp({
      email: `my-appointments-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}@lashary.test`,
      password: `pw-${Math.random().toString(36).slice(2)}`,
    })
    if (error || !data.session || !data.user) {
      throw new Error(`no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`)
    }
    const profile = await admin.query(
      'INSERT INTO public.clients_profiles (user_id, full_name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [data.user.id, `Clienta ${index}`, `my-appointments-${data.user.id}@lashary.test`, `${TEST_PHONE_PREFIX}${index}`],
    )
    const startsAtMs = FIRST_APPOINTMENT_MS + index * GAP_BETWEEN_APPOINTMENTS_MS
    const appointment = await admin.query(
      `INSERT INTO public.scheduling_appointments
         (resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
          is_first_time, service_price, deposit_required)
       VALUES ($1, 'approved', $2, $3, tstzrange($2, $3), $4, gen_random_uuid(), $5, true, 35000, 10000)
       RETURNING id`,
      [
        STUDIO_RESOURCE_ID,
        new Date(startsAtMs).toISOString(),
        new Date(startsAtMs + SERVICE_DURATION_MS).toISOString(),
        profile.rows[0].id,
        `zz-test mis citas ${index}`,
      ],
    )
    const db = createClient(API_URL, ANON_KEY, {
      ...CLIENT_OPTIONS,
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    })
    return { userId: data.user.id, profileId: profile.rows[0].id, appointmentId: appointment.rows[0].id, db }
  }

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()
    clientas.push(await createClienta(0), await createClienta(1))
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!admin) return
    const profileIds = clientas.map((clienta) => clienta.profileId)
    const userIds = clientas.map((clienta) => clienta.userId)
    if (profileIds.length > 0) {
      await admin.query('DELETE FROM public.scheduling_appointments WHERE client_id = ANY($1::uuid[])', [profileIds])
    }
    if (userIds.length > 0) await admin.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [userIds])
    await admin.end()
  })

  it('cada clienta lista solo su cita, aunque las dos existan en la misma tabla', async () => {
    for (const [index, clienta] of clientas.entries()) {
      const result = await createSupabaseMyAppointmentsRepository(clienta.db).listUpcoming(NOW_MS)

      expect(isOk(result)).toBe(true)
      if (!isOk(result)) return
      expect(result.value.map((item) => item.id)).toEqual([clienta.appointmentId])
      expect(result.value[0].techniqueName).toBe(`zz-test mis citas ${index}`)
    }
  })

  it('una sesión anónima no puede leer: la función no se le ejecuta y no se confunde con «sin citas»', async () => {
    const anon = createClient(API_URL, ANON_KEY, CLIENT_OPTIONS)
    const result = await createSupabaseMyAppointmentsRepository(anon).listUpcoming(NOW_MS)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
