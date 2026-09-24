import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// SEC-002 — Test de aislamiento RLS para payments_deposit_exemptions (US-AGE-13, criterio 5).
//
// Administrativa: sin lectura ni escritura pública, ni siquiera para la propia clienta (ningún
// criterio de US-AGE-13 pide que vea su exoneración todavía). Este archivo prueba el control
// negativo — anon y una clienta autenticada real (sign-up, sin service-role key, SEC-003) no
// leen ni escriben nada. El control positivo (staff sí puede, y que NADIE puede UPDATE/DELETE)
// vive en supabase/tests/database/payments_staff_access.test.sql (pgTAP), porque requiere
// sembrar un rol en auth_user_roles, algo que RLS no permite hacer desde un cliente anónimo.
//
// Harness de aislamiento portado por US-AGE-08 (primera tabla con RLS en esta rama, ADR-0007).
// Se salta si Supabase local no está disponible; en CI (job-tests-reales) sí lo está.

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

// Devuelve también un clients_profiles.id real (creado por la propia clienta, política
// clients_profiles_insert_own) — un client_id inventado haría fallar el INSERT por la FK antes
// de llegar a RLS, y el test dejaría de probar lo que dice probar.
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
