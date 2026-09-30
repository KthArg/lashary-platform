import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const TABLE = 'payments_deposit_exemptions'

let reachable = false
if (URL && ANON_KEY) {
  try {
    const res = await fetch(`${URL}/rest/v1/`, { headers: { apikey: ANON_KEY } })
    reachable = res.status < 500
  } catch {
    reachable = false
  }
}
if (!reachable) {
  console.warn('[payments/rls] Supabase local no disponible — suite omitida.')
}

async function signUpClienta(): Promise<{
  client: SupabaseClient
  userId: string
  clientId: string
}> {
  const anon = createClient(URL, ANON_KEY)
  const email = `rls-test-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
  const { data, error } = await anon.auth.signUp({
    email,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session || !data.user) {
    throw new Error(
      `no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`,
    )
  }
  const client = createClient(URL, ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  })
  const profile = await client
    .from('clients_profiles')
    .insert({ user_id: data.user.id, full_name: 'RLS test', email, phone: '00000000000' })
    .select('id')
    .single()
  if (profile.error || !profile.data) {
    throw new Error(
      `no se pudo crear el perfil de la clienta de prueba: ${profile.error?.message ?? 'sin fila'}`,
    )
  }
  return { client, userId: data.user.id, clientId: profile.data.id as string }
}

describe.skipIf(!reachable)('SEC-002 — aislamiento RLS de payments_deposit_exemptions', () => {
  let anon: SupabaseClient
  let clienta: SupabaseClient
  let userId: string
  let clientId: string

  beforeAll(async () => {
    anon = createClient(URL, ANON_KEY)
    const signedUp = await signUpClienta()
    clienta = signedUp.client
    userId = signedUp.userId
    clientId = signedUp.clientId
  })

  it('token anónimo no ve ninguna fila (sin política de SELECT)', async () => {
    const { data, error } = await anon.from(TABLE).select('id')
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  it('clienta autenticada sin rol de staff no ve ninguna fila', async () => {
    const staffCheck = await clienta.rpc('auth_is_staff')
    expect(staffCheck.error).toBeNull()
    expect(staffCheck.data).toBe(false)

    const { data, error } = await clienta.from(TABLE).select('id')
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  it('token anónimo no puede INSERT', async () => {
    const { error } = await anon
      .from(TABLE)
      .insert({
        client_id: clientId,
        exempted_by: userId,
        reason: 'rls probe',
      })
      .select()
    expect(error).not.toBeNull()
  })

  it('clienta autenticada sin rol de staff no puede INSERT', async () => {
    const { error } = await clienta
      .from(TABLE)
      .insert({
        client_id: clientId,
        exempted_by: userId,
        reason: 'rls probe',
      })
      .select()
    expect(error).not.toBeNull()
  })

  it('tras los intentos, la tabla sigue vacía para quien no es staff', async () => {
    const { data } = await anon.from(TABLE).select('id')
    expect(data ?? []).toHaveLength(0)
  })
})
