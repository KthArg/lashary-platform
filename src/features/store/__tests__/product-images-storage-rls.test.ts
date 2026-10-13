import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const BUCKET = 'store-product-images'
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

let reachable = false
if (URL && ANON_KEY) {
  try {
    const response = await fetch(`${URL}/rest/v1/`, { headers: { apikey: ANON_KEY } })
    reachable = response.status < 500
  } catch {
    reachable = false
  }
}
if (!reachable) {
  console.warn('[store/storage-rls] Supabase local no disponible — suite omitida.')
}

async function signUpCustomer(): Promise<SupabaseClient> {
  const anon = createClient(URL, ANON_KEY)
  const email = `rls-storage-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
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

const uploadAttempt = (client: SupabaseClient) =>
  client.storage
    .from(BUCKET)
    .upload(`rls-intento/${Date.now()}.png`, PNG_SIGNATURE, { contentType: 'image/png' })

describe.skipIf(!reachable)('SEC-002 — aislamiento del bucket store-product-images', () => {
  let anon: SupabaseClient
  let customer: SupabaseClient

  beforeAll(async () => {
    anon = createClient(URL, ANON_KEY)
    customer = await signUpCustomer()
  })

  it('anón no puede subir imágenes', async () => {
    const { data, error } = await uploadAttempt(anon)
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('una clienta autenticada sin rol de staff no puede subir imágenes', async () => {
    const { data, error } = await uploadAttempt(customer)
    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('ni anón ni una clienta pueden listar el contenido del bucket', async () => {
    const asAnon = await anon.storage.from(BUCKET).list()
    const asCustomer = await customer.storage.from(BUCKET).list()
    expect(asAnon.data ?? []).toEqual([])
    expect(asCustomer.data ?? []).toEqual([])
  })

  it('ni anón ni una clienta pueden borrar archivos del bucket', async () => {
    const asAnon = await anon.storage.from(BUCKET).remove(['cualquier/archivo.png'])
    const asCustomer = await customer.storage.from(BUCKET).remove(['cualquier/archivo.png'])
    expect(asAnon.data ?? []).toEqual([])
    expect(asCustomer.data ?? []).toEqual([])
  })
})
