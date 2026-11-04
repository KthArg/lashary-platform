import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const LEDGER_TABLE = 'payments_ledger_entries'
const RECORD_CLOSE_ENTRIES_FUNCTION = 'payments_record_close_entries'
const CLIENT_BALANCE_FUNCTION = 'payments_client_balance'
const PROBE_CHARGE = 1000
const PROBE_DEPOSIT_CREDIT = 0
const EMPTY_BALANCE = 0
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
  const email = `ledger-rls-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
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

describe.skipIf(!isConfigured)('SEC-002 — aislamiento RLS de payments_ledger_entries', () => {
  let anonymousClient: SupabaseClient
  let clientaClient: SupabaseClient

  beforeAll(async () => {
    isReachable = await probeSupabase()
    if (!isReachable) {
      console.warn('[payments/ledger-rls] Supabase local no disponible — suite omitida.')
      return
    }
    anonymousClient = createClient(SUPABASE_URL, ANON_KEY, SESSION_OPTIONS)
    clientaClient = await signInNewClienta()
  })

  itLive('token anónimo no ve ningún asiento', async () => {
    const { data } = await anonymousClient.from(LEDGER_TABLE).select('id')
    expect(data ?? []).toHaveLength(0)
  })

  itLive('clienta sin rol de staff no ve ningún asiento', async () => {
    const { data, error } = await clientaClient.from(LEDGER_TABLE).select('id')
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  itLive('anónimo y clienta no pueden insertar un asiento', async () => {
    const attempt = { client_id: randomUUID(), appointment_id: randomUUID(), kind: 'charge', amount: PROBE_CHARGE }
    const anonymousAttempt = await anonymousClient.from(LEDGER_TABLE).insert(attempt)
    const clientaAttempt = await clientaClient.from(LEDGER_TABLE).insert(attempt)
    expect(anonymousAttempt.error).not.toBeNull()
    expect(clientaAttempt.error).not.toBeNull()
  })

  itLive('la clienta no puede registrar el cierre de una cita por la función', async () => {
    const { error } = await clientaClient.rpc(RECORD_CLOSE_ENTRIES_FUNCTION, {
      p_client_id: randomUUID(),
      p_appointment_id: randomUUID(),
      p_charge: PROBE_CHARGE,
      p_deposit_credit: PROBE_DEPOSIT_CREDIT,
    })
    expect(error).not.toBeNull()
  })

  itLive('la clienta no puede modificar ni borrar asientos', async () => {
    const updateAttempt = await clientaClient.from(LEDGER_TABLE).update({ amount: 1 }).eq('kind', 'charge')
    const deleteAttempt = await clientaClient.from(LEDGER_TABLE).delete().eq('kind', 'charge')
    expect(updateAttempt.error).not.toBeNull()
    expect(deleteAttempt.error).not.toBeNull()
  })

  itLive('anónimo no consulta saldos y la clienta recibe 0', async () => {
    const anonymousBalance = await anonymousClient.rpc(CLIENT_BALANCE_FUNCTION, { p_client_id: randomUUID() })
    const clientaBalance = await clientaClient.rpc(CLIENT_BALANCE_FUNCTION, { p_client_id: randomUUID() })
    expect(anonymousBalance.error).not.toBeNull()
    expect(clientaBalance.error).toBeNull()
    expect(clientaBalance.data).toBe(EMPTY_BALANCE)
  })
})
