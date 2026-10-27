import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isOk } from '@/shared/result'
import { getClientContactForReminders } from '../reminders-api'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const STAFF_ROLE = 'admin'
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
  console.warn('[clients] Supabase local no disponible — pruebas de integración de reminders-api omitidas.')
}

describe.skipIf(!reachable)('getClientContactForReminders (Supabase local)', () => {
  let admin: PgClient
  let staffClient: SupabaseClient
  let staffUserId: string
  let clientId: string

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()

    const anon = createClient(API_URL, ANON_KEY, NO_PERSIST_OPTIONS)
    const email = `clients-reminders-api-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
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

    const inserted = await admin.query(
      `INSERT INTO public.clients_profiles (full_name, email, phone, notes)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['Clienta de prueba para recordatorios', `clienta-reminders-${Date.now()}@lashary.test`, '+50688880000', 'nota clínica sensible, nunca debe salir de aquí'],
    )
    clientId = inserted.rows[0].id as string
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!admin) return
    if (clientId) await admin.query('DELETE FROM public.clients_profiles WHERE id = $1', [clientId])
    if (staffUserId) await admin.query('DELETE FROM auth.users WHERE id = $1', [staffUserId])
    await admin.end()
  })

  it('trae solo phone y email de una clienta real, nunca notes (M5 de la auditoría)', async () => {
    const result = await getClientContactForReminders(clientId, staffClient)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ phone: '+50688880000', email: expect.stringContaining('clienta-reminders-') })
    expect(result.value && 'notes' in result.value).toBe(false)
  })

  it('devuelve null (no un error) para una clienta que no existe', async () => {
    const result = await getClientContactForReminders(crypto.randomUUID(), staffClient)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toBeNull()
  })

  it('anon no puede leer el contacto de ninguna clienta (SEC-002, fail-closed)', async () => {
    const anonClient = createClient(API_URL, ANON_KEY, NO_PERSIST_OPTIONS)
    const result = await getClientContactForReminders(clientId, anonClient)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toBeNull()
  })
})
