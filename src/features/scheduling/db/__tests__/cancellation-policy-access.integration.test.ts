import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseCancellationPolicyRepository } from '../cancellation-policy-repository'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']
const SETUP_TIMEOUT_MS = 60_000
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } }
const ROLES = { admin: 'admin', client: 'cliente' } as const

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
  console.warn('[scheduling/db] Supabase local no disponible — prueba de acceso a la política de cancelación omitida.')
}

describe.skipIf(!reachable)('la ventana de cancelación solo la cambia la administradora (Supabase local)', () => {
  let pg: PgClient
  const userIds: string[] = []
  let adminDb: SupabaseClient
  let clientDb: SupabaseClient

  async function createSession(label: string, role: string): Promise<SupabaseClient> {
    const anon = createClient(API_URL, ANON_KEY, CLIENT_OPTIONS)
    const { data, error } = await anon.auth.signUp({
      email: `cancellation-policy-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`,
      password: `pw-${Math.random().toString(36).slice(2)}`,
    })
    if (error || !data.session || !data.user) {
      throw new Error(`no se pudo crear el usuario de prueba: ${error?.message ?? 'sin sesión'}`)
    }
    userIds.push(data.user.id)
    await pg.query('UPDATE public.auth_user_roles SET role = $1 WHERE user_id = $2', [role, data.user.id])
    return createClient(API_URL, ANON_KEY, {
      ...CLIENT_OPTIONS,
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    })
  }

  async function currentWindowHours(): Promise<number> {
    const { rows } = await pg.query('SELECT cancellation_window_hours FROM public.scheduling_cancellation_policy')
    return rows[0].cancellation_window_hours
  }

  beforeAll(async () => {
    pg = new PgClient({ connectionString: DB_URL })
    await pg.connect()
    adminDb = await createSession('admin', ROLES.admin)
    clientDb = await createSession('client', ROLES.client)
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!pg) return
    if (userIds.length > 0) await pg.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [userIds])
    await pg.end()
  })

  it('la administradora lee la ventana y la guarda (con la misma cifra, para no mover una tabla compartida)', async () => {
    const policy = createSupabaseCancellationPolicyRepository(adminDb)
    const current = await policy.getWindowHours()

    expect(isOk(current)).toBe(true)
    if (!isOk(current)) return
    expect(isOk(await policy.setWindowHours(current.value))).toBe(true)
  })

  it('una clienta no la lee ni la cambia, y no lo da por guardado', async () => {
    const policy = createSupabaseCancellationPolicyRepository(clientDb)

    expect(isErr(await policy.getWindowHours())).toBe(true)
    expect(isErr(await policy.setWindowHours(await currentWindowHours()))).toBe(true)
  })

  it('una sesión anónima tampoco', async () => {
    const policy = createSupabaseCancellationPolicyRepository(createClient(API_URL, ANON_KEY, CLIENT_OPTIONS))

    expect(isErr(await policy.getWindowHours())).toBe(true)
    expect(isErr(await policy.setWindowHours(await currentWindowHours()))).toBe(true)
  })
})
