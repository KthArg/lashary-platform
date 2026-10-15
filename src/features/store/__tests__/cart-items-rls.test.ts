import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const TABLE = 'store_cart_items'
const INITIAL_QUANTITY = 2
const UPDATED_QUANTITY = 3
const TAMPERED_QUANTITY = 50
const QUANTITY_BELOW_RANGE = 0
const QUANTITY_ABOVE_RANGE = 100

const configured = Boolean(URL && ANON_KEY)
let reachable = false

async function probeSupabase(): Promise<boolean> {
  try {
    const response = await fetch(`${URL}/rest/v1/`, { headers: { apikey: ANON_KEY } })
    return response.status < 500
  } catch {
    return false
  }
}

function itLive(name: string, testBody: () => Promise<void>) {
  it(name, async (context) => {
    context.skip(!reachable)
    await testBody()
  })
}

type SignedUpCustomer = { client: SupabaseClient; userId: string }

async function signUpCustomer(): Promise<SignedUpCustomer> {
  const anon = createClient(URL, ANON_KEY)
  const email = `rls-cart-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
  const { data, error } = await anon.auth.signUp({
    email,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session || !data.user) {
    throw new Error(`no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`)
  }
  const client = createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  return { client, userId: data.user.id }
}

describe.skipIf(!configured)('SEC-002 — aislamiento RLS de store_cart_items', () => {
  let anon: SupabaseClient
  let owner: SignedUpCustomer
  let intruder: SignedUpCustomer
  let productId = ''

  beforeAll(async () => {
    reachable = await probeSupabase()
    if (!reachable) {
      console.warn('[store/cart-rls] Supabase local no disponible — suite omitida.')
      return
    }
    anon = createClient(URL, ANON_KEY)
    owner = await signUpCustomer()
    intruder = await signUpCustomer()

    const { data } = await anon.from('store_products').select('id').eq('activo', true).limit(1)
    productId = data?.[0]?.id ?? ''
    if (!productId) throw new Error('setup: el seed de store_products no está cargado')

    const inserted = await owner.client
      .from(TABLE)
      .insert({ user_id: owner.userId, product_id: productId, cantidad: INITIAL_QUANTITY })
      .select()
    if (inserted.error) throw new Error(`setup: la dueña no pudo agregar: ${inserted.error.message}`)
  })

  itLive('la clienta lee y modifica su propia línea del carrito', async () => {
    const read = await owner.client.from(TABLE).select('product_id, cantidad')
    expect(read.error).toBeNull()
    expect(read.data).toEqual([{ product_id: productId, cantidad: INITIAL_QUANTITY }])

    const update = await owner.client
      .from(TABLE)
      .update({ cantidad: UPDATED_QUANTITY })
      .eq('product_id', productId)
      .select('cantidad')
    expect(update.data).toEqual([{ cantidad: UPDATED_QUANTITY }])
  })

  itLive('el token anónimo no ve ninguna línea ni puede agregar', async () => {
    const read = await anon.from(TABLE).select('product_id')
    expect(read.data ?? []).toHaveLength(0)

    const insert = await anon
      .from(TABLE)
      .insert({ user_id: owner.userId, product_id: productId, cantidad: 1 })
      .select()
    expect(insert.error).not.toBeNull()
  })

  itLive('otra clienta no ve el carrito de la dueña', async () => {
    const { data, error } = await intruder.client
      .from(TABLE)
      .select('product_id')
      .eq('user_id', owner.userId)
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  itLive('otra clienta no puede agregar una línea a nombre de la dueña', async () => {
    const insert = await intruder.client
      .from(TABLE)
      .insert({ user_id: owner.userId, product_id: productId, cantidad: 1 })
      .select()
    expect(insert.error).not.toBeNull()
  })

  itLive('otra clienta no puede modificar ni quitar la línea de la dueña', async () => {
    const update = await intruder.client
      .from(TABLE)
      .update({ cantidad: TAMPERED_QUANTITY })
      .eq('user_id', owner.userId)
      .select()
    expect(update.data ?? []).toHaveLength(0)

    const remove = await intruder.client
      .from(TABLE)
      .delete()
      .eq('user_id', owner.userId)
      .select()
    expect(remove.data ?? []).toHaveLength(0)

    const { data } = await owner.client.from(TABLE).select('cantidad').eq('product_id', productId)
    expect(data).toEqual([{ cantidad: UPDATED_QUANTITY }])
  })

  itLive('la base rechaza cantidades fuera de 1 a 99', async () => {
    const belowRange = await owner.client
      .from(TABLE)
      .update({ cantidad: QUANTITY_BELOW_RANGE })
      .eq('product_id', productId)
      .select()
    expect(belowRange.error).not.toBeNull()

    const aboveRange = await owner.client
      .from(TABLE)
      .update({ cantidad: QUANTITY_ABOVE_RANGE })
      .eq('product_id', productId)
      .select()
    expect(aboveRange.error).not.toBeNull()
  })

  itLive('la clienta quita su propia línea', async () => {
    const remove = await owner.client
      .from(TABLE)
      .delete()
      .eq('product_id', productId)
      .select('product_id')
    expect(remove.data).toEqual([{ product_id: productId }])

    const { data } = await owner.client.from(TABLE).select('product_id')
    expect(data ?? []).toHaveLength(0)
  })
})
