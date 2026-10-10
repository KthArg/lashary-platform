import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const TABLE = 'catalog_techniques'

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
  console.warn('[catalog/rls] Supabase local no disponible — suite omitida.')
}

async function signUpClient(): Promise<SupabaseClient> {
  const anon = createClient(URL, ANON_KEY)
  const email = `rls-test-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
  const { data, error } = await anon.auth.signUp({
    email,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session) {
    throw new Error(
      `no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`,
    )
  }
  return createClient(URL, ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  })
}

const writeAttempt = {
  name: 'RLS intento de escritura',
  family: 'henna',
  price_first_time: 1,
  duration_first_time_min: 1,
  buffer_min: 0,
  deposit: 0,
  aftercare_text: 'no debería entrar',
}

describe.skipIf(!reachable)('SEC-002 — aislamiento RLS de catalog_techniques', () => {
  let anon: SupabaseClient
  let client: SupabaseClient
  let sampleId = ''
  let sampleName = ''
  let initialCount = 0

  beforeAll(async () => {
    anon = createClient(URL, ANON_KEY)
    client = await signUpClient()

    const { data } = await anon.from(TABLE).select('id, name').limit(1)
    sampleId = data?.[0]?.id ?? ''
    sampleName = data?.[0]?.name ?? ''

    const { count } = await anon
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
    initialCount = count ?? 0

    if (!sampleId || initialCount === 0) {
      throw new Error('setup: el seed de catalog_techniques no está cargado')
    }
  })

  it('lectura pública intencional: anón y clienta autenticada pueden SELECT', async () => {
    const asAnon = await anon.from(TABLE).select('id')
    const asClient = await client.from(TABLE).select('id')
    expect(asAnon.error).toBeNull()
    expect(asClient.error).toBeNull()
    expect((asAnon.data ?? []).length).toBeGreaterThan(0)
    expect((asClient.data ?? []).length).toBeGreaterThan(0)
  })

  it('token anónimo NO puede INSERT / UPDATE / DELETE', async () => {
    const insert = await anon.from(TABLE).insert(writeAttempt).select()
    expect(insert.error).not.toBeNull()

    const update = await anon
      .from(TABLE)
      .update({ price_first_time: 999_999 })
      .eq('id', sampleId)
      .select()
    expect(update.data ?? []).toHaveLength(0)

    const remove = await anon.from(TABLE).delete().eq('id', sampleId).select()
    expect(remove.data ?? []).toHaveLength(0)
  })

  it('clienta autenticada sin rol de staff NO puede INSERT / UPDATE / DELETE', async () => {
    const staffCheck = await client.rpc('auth_is_staff')
    expect(staffCheck.error).toBeNull()
    expect(staffCheck.data).toBe(false)

    const insert = await client.from(TABLE).insert(writeAttempt).select()
    expect(insert.error).not.toBeNull()

    const update = await client
      .from(TABLE)
      .update({ price_first_time: 999_999 })
      .eq('id', sampleId)
      .select()
    expect(update.data ?? []).toHaveLength(0)

    const remove = await client.from(TABLE).delete().eq('id', sampleId).select()
    expect(remove.data ?? []).toHaveLength(0)
  })

  it('tras los intentos, la fila de muestra no cambió', async () => {
    const { data } = await anon
      .from(TABLE)
      .select('name, price_first_time')
      .eq('id', sampleId)
      .single()
    expect(data?.name).toBe(sampleName)
    expect(data?.price_first_time).not.toBe(999_999)
  })

  it('tras los intentos, el conteo total no cambió (nadie insertó ni borró)', async () => {
    const { count } = await anon
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
    expect(count).toBe(initialCount)
  })
})
