import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const CLOSE_APPOINTMENT_FUNCTION = 'scheduling_close_appointment'
const COMPLETED_OUTCOME = 'completed'
const SESSION_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } }

const isConfigured = Boolean(SUPABASE_URL && ANON_KEY)
let isReachable = false

async function probeSupabase(): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: ANON_KEY } })
    return response.status < 500
  } catch {
    return false
  }
}

function itLive(name: string, body: () => Promise<void>) {
  it(name, async (context) => {
    context.skip(!isReachable)
    await body()
  })
}

async function signInNewClienta(): Promise<SupabaseClient> {
  const anonymousClient = createClient(SUPABASE_URL, ANON_KEY, SESSION_OPTIONS)
  const email = `close-rls-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
  const { data, error } = await anonymousClient.auth.signUp({
    email,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session) {
    throw new Error(`no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`)
  }
  return createClient(SUPABASE_URL, ANON_KEY, {
    ...SESSION_OPTIONS,
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
}

describe.skipIf(!isConfigured)('SEC-002 — nadie sin rol de staff cierra citas', () => {
  let anonymousClient: SupabaseClient
  let clientaClient: SupabaseClient

  beforeAll(async () => {
    isReachable = await probeSupabase()
    if (!isReachable) {
      console.warn('[scheduling/close-isolation] Supabase local no disponible — suite omitida.')
      return
    }
    anonymousClient = createClient(SUPABASE_URL, ANON_KEY, SESSION_OPTIONS)
    clientaClient = await signInNewClienta()
  })

  itLive('anónimo no puede ejecutar el cierre', async () => {
    const { error } = await anonymousClient.rpc(CLOSE_APPOINTMENT_FUNCTION, {
      p_appointment_id: randomUUID(),
      p_outcome: COMPLETED_OUTCOME,
    })
    expect(error).not.toBeNull()
  })

  itLive('una clienta autenticada sin rol de staff no puede cerrar una cita', async () => {
    const { data, error } = await clientaClient.rpc(CLOSE_APPOINTMENT_FUNCTION, {
      p_appointment_id: randomUUID(),
      p_outcome: COMPLETED_OUTCOME,
    })
    expect(error).not.toBeNull()
    expect(data ?? []).toHaveLength(0)
  })
})
