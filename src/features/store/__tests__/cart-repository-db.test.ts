import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isOk } from '@/shared/result'
import { createCartRepository } from '@/features/store/db/cart-repository'
import { addToCart, removeFromCart, updateCartQuantity } from '@/features/store/application/cart/commands'
import { getCart } from '@/features/store/application/cart/queries'

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn() }))

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const MISSING_PRODUCT_ID = '00000000-0000-4000-8000-000000000000'
const UPDATED_QUANTITY = 5

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

function clientWithToken(accessToken: string): SupabaseClient {
  return createClient(URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

type Product = { id: string; precio_crc: number | string }

describe.skipIf(!configured)('repositorio del carrito contra Supabase local', () => {
  let accessToken = ''
  let userId = ''
  let product: Product

  beforeAll(async () => {
    reachable = await probeSupabase()
    if (!reachable) {
      console.warn('[store/cart-repository] Supabase local no disponible — suite omitida.')
      return
    }
    const anon = createClient(URL, ANON_KEY)
    const { data, error } = await anon.auth.signUp({
      email: `cart-repo-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`,
      password: `pw-${Math.random().toString(36).slice(2)}`,
    })
    if (error || !data.session || !data.user) {
      throw new Error(`no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`)
    }
    accessToken = data.session.access_token
    userId = data.user.id

    const products = await anon
      .from('store_products')
      .select('id, precio_crc')
      .eq('activo', true)
      .limit(1)
    if (!products.data?.[0]) throw new Error('setup: el seed de store_products no está cargado')
    product = products.data[0] as Product
  })

  itLive('el carrito persiste: otra conexión con la sesión de la clienta lo encuentra igual', async () => {
    const deps = { repo: createCartRepository(clientWithToken(accessToken)) }
    expect(isOk(await addToCart(deps)(userId, product.id))).toBe(true)
    expect(isOk(await addToCart(deps)(userId, product.id))).toBe(true)

    const freshConnection = { repo: createCartRepository(clientWithToken(accessToken)) }
    const cart = await getCart(freshConnection)(userId)

    expect(cart.lines).toHaveLength(1)
    expect(cart.lines[0].product.id).toBe(product.id)
    expect(cart.lines[0].quantity).toBe(2)
    expect(cart.subtotal.colones).toBe(Number(product.precio_crc) * 2)
  })

  itLive('cambia la cantidad de una línea y la quita', async () => {
    const deps = { repo: createCartRepository(clientWithToken(accessToken)) }

    expect(isOk(await updateCartQuantity(deps)(userId, product.id, UPDATED_QUANTITY))).toBe(true)
    expect(await deps.repo.findQuantity(userId, product.id)).toBe(UPDATED_QUANTITY)

    await removeFromCart(deps)(userId, product.id)
    expect(await deps.repo.findQuantity(userId, product.id)).toBeNull()
    expect((await getCart(deps)(userId)).lines).toHaveLength(0)
  })

  itLive('no da por activo un producto que no existe', async () => {
    const repo = createCartRepository(clientWithToken(accessToken))
    expect(await repo.isProductActive(product.id)).toBe(true)
    expect(await repo.isProductActive(MISSING_PRODUCT_ID)).toBe(false)
  })
})
