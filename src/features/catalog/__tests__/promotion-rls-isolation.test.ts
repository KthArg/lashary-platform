import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// SEC-002 — Test de aislamiento RLS para catalog_promotions.
//
// catalog_promotions es catálogo compartido del estudio (no dato por-clienta): la LECTURA
// pública es intencional (la landing y el flujo de agendamiento la consumirán, criterio 2).
// Lo que RLS debe garantizar es que nadie sin rol de staff pueda ESCRIBIR. Se verifica con
// token anónimo y con el token de una clienta autenticada real (sign-up, sin service-role key,
// SEC-003). Se salta si Supabase local no está disponible.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const TABLE = 'catalog_promotions'

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

async function signUpClienta(): Promise<SupabaseClient> {
  const anon = createClient(URL, ANON_KEY)
  const email = `rls-test-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
  const { data, error } = await anon.auth.signUp({
    email,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session) {
    throw new Error(`no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`)
  }
  return createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
}

describe.skipIf(!reachable)('SEC-002 — aislamiento RLS de catalog_promotions', () => {
  let anon: SupabaseClient
  let clienta: SupabaseClient
  let techniqueId = ''
  let samplePromotionId = ''
  let initialCount = 0

  beforeAll(async () => {
    anon = createClient(URL, ANON_KEY)
    clienta = await signUpClienta()

    const { data: techniques } = await anon.from('catalog_techniques').select('id').limit(1)
    techniqueId = techniques?.[0]?.id ?? ''
    if (!techniqueId) throw new Error('setup: el seed de catalog_techniques no está cargado')

    const { data: promos } = await anon.from(TABLE).select('id').limit(1)
    samplePromotionId = promos?.[0]?.id ?? ''

    const { count } = await anon.from(TABLE).select('*', { count: 'exact', head: true })
    initialCount = count ?? 0

    if (!samplePromotionId || initialCount === 0) {
      throw new Error('setup: el seed de catalog_promotions no está cargado')
    }
  })

  const writeAttempt = () => ({
    technique_id: techniqueId,
    discount_percent: 1,
    starts_at: '2020-01-01T00:00:00Z',
    ends_at: '2020-01-02T00:00:00Z',
  })

  it('lectura pública intencional: anón y clienta autenticada pueden SELECT', async () => {
    const asAnon = await anon.from(TABLE).select('id')
    const asClienta = await clienta.from(TABLE).select('id')
    expect(asAnon.error).toBeNull()
    expect(asClienta.error).toBeNull()
    expect((asAnon.data ?? []).length).toBeGreaterThan(0)
    expect((asClienta.data ?? []).length).toBeGreaterThan(0)
  })

  it('token anónimo NO puede INSERT / UPDATE / DELETE', async () => {
    const insert = await anon.from(TABLE).insert(writeAttempt()).select()
    expect(insert.error).not.toBeNull()

    const update = await anon
      .from(TABLE)
      .update({ discount_percent: 99 })
      .eq('id', samplePromotionId)
      .select()
    expect(update.data ?? []).toHaveLength(0)

    const remove = await anon.from(TABLE).delete().eq('id', samplePromotionId).select()
    expect(remove.data ?? []).toHaveLength(0)
  })

  it('clienta autenticada sin rol de staff NO puede INSERT / UPDATE / DELETE', async () => {
    const insert = await clienta.from(TABLE).insert(writeAttempt()).select()
    expect(insert.error).not.toBeNull()

    const update = await clienta
      .from(TABLE)
      .update({ discount_percent: 99 })
      .eq('id', samplePromotionId)
      .select()
    expect(update.data ?? []).toHaveLength(0)

    const remove = await clienta.from(TABLE).delete().eq('id', samplePromotionId).select()
    expect(remove.data ?? []).toHaveLength(0)
  })

  it('tras los intentos, el conteo total no cambió (nadie insertó ni borró)', async () => {
    const { count } = await anon.from(TABLE).select('*', { count: 'exact', head: true })
    expect(count).toBe(initialCount)
  })
})
