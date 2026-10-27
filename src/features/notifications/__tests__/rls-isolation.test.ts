import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const REMINDERS_TABLE = 'notifications_reminders'

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
let isSupabaseReachable = false

async function probeSupabase(): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: SUPABASE_ANON_KEY } })
    return response.status < 500
  } catch {
    return false
  }
}

function itLive(name: string, fn: () => Promise<void>) {
  it(name, async (context) => {
    context.skip(!isSupabaseReachable)
    await fn()
  })
}

async function signUpClienta(): Promise<{ clientaClient: SupabaseClient; clientId: string }> {
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const email = `rls-notifications-test-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session || !data.user) {
    throw new Error(`no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`)
  }
  const clientaClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  const profile = await clientaClient
    .from('clients_profiles')
    .insert({ user_id: data.user.id, full_name: 'RLS test', email, phone: '00000000000' })
    .select('id')
    .single()
  if (profile.error || !profile.data) {
    throw new Error(`no se pudo crear el perfil de la clienta de prueba: ${profile.error?.message ?? 'sin fila'}`)
  }
  return { clientaClient, clientId: profile.data.id as string }
}

describe.skipIf(!isSupabaseConfigured)('SEC-002 — aislamiento RLS de notifications_reminders', () => {
  let anonClient: SupabaseClient
  let clientaClient: SupabaseClient
  let clientId: string

  beforeAll(async () => {
    isSupabaseReachable = await probeSupabase()
    if (!isSupabaseReachable) {
      console.warn('[notifications/rls] Supabase local no disponible — suite omitida.')
      return
    }
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const signedUpClienta = await signUpClienta()
    clientaClient = signedUpClienta.clientaClient
    clientId = signedUpClienta.clientId
  })

  itLive('token anónimo no ve ninguna fila', async () => {
    const { data, error } = await anonClient.from(REMINDERS_TABLE).select('id')
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  itLive('clienta autenticada sin rol de staff no ve ninguna fila, aunque sea su propia cita', async () => {
    const staffCheck = await clientaClient.rpc('auth_is_staff')
    expect(staffCheck.error).toBeNull()
    expect(staffCheck.data).toBe(false)

    const { data, error } = await clientaClient.from(REMINDERS_TABLE).select('id')
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  itLive('token anónimo no puede INSERT', async () => {
    const { error } = await anonClient
      .from(REMINDERS_TABLE)
      .insert({
        appointment_id: '00000000-0000-0000-0000-00000000a999',
        client_id: clientId,
        starts_at: new Date().toISOString(),
        technique_name: 'rls probe',
        send_at: new Date().toISOString(),
      })
      .select()
    expect(error).not.toBeNull()
  })

  itLive('clienta autenticada sin rol de staff no puede INSERT', async () => {
    const { error } = await clientaClient
      .from(REMINDERS_TABLE)
      .insert({
        appointment_id: '00000000-0000-0000-0000-00000000a998',
        client_id: clientId,
        starts_at: new Date().toISOString(),
        technique_name: 'rls probe',
        send_at: new Date().toISOString(),
      })
      .select()
    expect(error).not.toBeNull()
  })

  itLive('tras los intentos, la tabla sigue vacía para quien no es staff', async () => {
    const { data } = await anonClient.from(REMINDERS_TABLE).select('id')
    expect(data ?? []).toHaveLength(0)
  })
})
