import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// SEC-002 — Test de aislamiento RLS para audit_events (bitácora de auditoría, US-AGE-13).
//
// A diferencia de catalog_techniques, esta tabla NO tiene lectura pública: es administrativa.
// Este archivo prueba el control negativo — anon y una clienta autenticada real (sign-up, sin
// service-role key, SEC-003) no leen ni escriben nada. El control positivo (staff sí puede, y
// que NADIE, ni siquiera staff, puede UPDATE/DELETE) vive en
// supabase/tests/database/audit_staff_access.test.sql (pgTAP), porque requiere sembrar un rol
// en auth_user_roles, algo que RLS no permite hacer desde un cliente anónimo.
//
// Harness de aislamiento portado por US-AGE-08 (primera tabla con RLS en esta rama, ADR-0007).
// Se salta si Supabase local no está disponible; en CI (job-tests-reales) sí lo está.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const TABLE = 'audit_events'

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
  console.warn('[audit/rls] Supabase local no disponible — suite omitida.')
}

async function signUpClienta(): Promise<{ client: SupabaseClient; userId: string }> {
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
  return { client, userId: data.user.id }
}

describe.skipIf(!reachable)('SEC-002 — aislamiento RLS de audit_events', () => {
  let anon: SupabaseClient
  let clienta: SupabaseClient
  let clientaId: string

  beforeAll(async () => {
    anon = createClient(URL, ANON_KEY)
    const signedUp = await signUpClienta()
    clienta = signedUp.client
    clientaId = signedUp.userId
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
        actor_id: clientaId,
        action: 'rls.probe',
        entity_type: 'rls_probe',
        entity_id: clientaId,
      })
      .select()
    expect(error).not.toBeNull()
  })

  it('clienta autenticada sin rol de staff no puede INSERT', async () => {
    const { error } = await clienta
      .from(TABLE)
      .insert({
        actor_id: clientaId,
        action: 'rls.probe',
        entity_type: 'rls_probe',
        entity_id: clientaId,
      })
      .select()
    expect(error).not.toBeNull()
  })

  it('tras los intentos, la tabla sigue vacía para quien no es staff', async () => {
    const { data } = await anon.from(TABLE).select('id')
    expect(data ?? []).toHaveLength(0)
  })
})
