import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const REMINDERS_TABLE = 'notifications_reminders'
const INBOX_TABLE = 'notifications_admin_inbox'
const NO_SAVED_SESSION = { auth: { persistSession: false, autoRefreshToken: false } }

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
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, NO_SAVED_SESSION)
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

describe.skipIf(!isSupabaseConfigured)('SEC-002 — aislamiento RLS de notifications_admin_inbox (US-NOT-01)', () => {
  const PROBE_APPOINTMENT_ID = '00000000-0000-0000-0000-00000000b997'
  let anonClient: SupabaseClient
  let clientaClient: SupabaseClient

  beforeAll(async () => {
    isSupabaseReachable = await probeSupabase()
    if (!isSupabaseReachable) return
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, NO_SAVED_SESSION)
    clientaClient = (await signUpClienta()).clientaClient
  })

  itLive('token anónimo no puede leer la bandeja', async () => {
    const { error } = await anonClient.from(INBOX_TABLE).select('id')
    expect(error).not.toBeNull()
  })

  itLive('clienta autenticada no ve ningún aviso ni puede marcarlos', async () => {
    const read = await clientaClient.from(INBOX_TABLE).select('id')
    expect(read.error).toBeNull()
    expect(read.data ?? []).toHaveLength(0)

    const marked = await clientaClient.from(INBOX_TABLE).update({ read_at: new Date().toISOString() }).not('id', 'is', null).select('id')
    expect(marked.data ?? []).toHaveLength(0)
  })

  itLive('ni la clienta ni anon pueden fabricar avisos, ni por la tabla ni por la función', async () => {
    const probe = { p_appointment_id: PROBE_APPOINTMENT_ID, p_client_name: 'Falsa', p_service_name: 'Falso', p_starts_at: new Date().toISOString() }

    for (const client of [anonClient, clientaClient]) {
      const inserted = await client
        .from(INBOX_TABLE)
        .insert({ kind: 'booking_created', appointment_id: PROBE_APPOINTMENT_ID, client_name: 'Falsa', service_name: 'Falso', starts_at: probe.p_starts_at })
        .select()
      expect(inserted.error).not.toBeNull()

      const recorded = await client.rpc('notifications_record_booking', probe)
      expect(recorded.error).not.toBeNull()
    }
  })
})
