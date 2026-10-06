import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const TABLE = 'store_products'

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
  console.warn('[store/rls] Supabase local no disponible — suite omitida.')
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
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  })
}

const writeAttempt = {
  slug: `rls-intento-${Date.now()}`,
  nombre: 'RLS intento de escritura',
  url_imagen: '/productos/no-deberia-entrar.jpg',
  precio_crc: 1,
  activo: true,
}

describe.skipIf(!reachable)('SEC-002 — aislamiento RLS de store_products', () => {
  let anon: SupabaseClient
  let clienta: SupabaseClient
  let sampleId = ''
  let sampleName = ''
  let initialCount = 0

  beforeAll(async () => {
    anon = createClient(URL, ANON_KEY)
    clienta = await signUpClienta()

    const { data } = await anon.from(TABLE).select('id, nombre').eq('activo', true).limit(1)
    sampleId = data?.[0]?.id ?? ''
    sampleName = data?.[0]?.nombre ?? ''

    const { count } = await anon
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
    initialCount = count ?? 0

    if (!sampleId || initialCount === 0) {
      throw new Error('setup: el seed de store_products no está cargado')
    }
  })

  it('lectura pública intencional: anón y clienta autenticada ven solo los productos activos', async () => {
    const asAnon = await anon.from(TABLE).select('id, activo')
    const asClienta = await clienta.from(TABLE).select('id, activo')
    expect(asAnon.error).toBeNull()
    expect(asClienta.error).toBeNull()
    expect((asAnon.data ?? []).every((row) => row.activo === true)).toBe(true)
    expect((asClienta.data ?? []).every((row) => row.activo === true)).toBe(true)
  })

  it('token anónimo NO puede INSERT / UPDATE / DELETE', async () => {
    const insert = await anon.from(TABLE).insert(writeAttempt).select()
    expect(insert.error).not.toBeNull()

    const update = await anon
      .from(TABLE)
      .update({ precio_crc: 999_999 })
      .eq('id', sampleId)
      .select()
    expect(update.data ?? []).toHaveLength(0)

    const remove = await anon.from(TABLE).delete().eq('id', sampleId).select()
    expect(remove.data ?? []).toHaveLength(0)
  })

  it('clienta autenticada sin rol de staff NO puede INSERT / UPDATE / DELETE', async () => {
    const staffCheck = await clienta.rpc('auth_is_staff')
    expect(staffCheck.error).toBeNull()
    expect(staffCheck.data).toBe(false)

    const insert = await clienta.from(TABLE).insert(writeAttempt).select()
    expect(insert.error).not.toBeNull()

    const update = await clienta
      .from(TABLE)
      .update({ precio_crc: 999_999 })
      .eq('id', sampleId)
      .select()
    expect(update.data ?? []).toHaveLength(0)

    const remove = await clienta.from(TABLE).delete().eq('id', sampleId).select()
    expect(remove.data ?? []).toHaveLength(0)
  })

  it('tras los intentos, la fila de muestra no cambió', async () => {
    const { data } = await anon
      .from(TABLE)
      .select('nombre, precio_crc')
      .eq('id', sampleId)
      .single()
    expect(data?.nombre).toBe(sampleName)
    expect(data?.precio_crc).not.toBe(999_999)
  })

  it('tras los intentos, el conteo de productos activos no cambió (nadie insertó ni borró)', async () => {
    const { count } = await anon
      .from(TABLE)
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)
    expect(count).toBe(initialCount)
  })
})
