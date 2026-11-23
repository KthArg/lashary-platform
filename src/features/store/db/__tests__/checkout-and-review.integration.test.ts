import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isErr, isOk } from '@/shared/result'
import { checkout } from '../../application/checkout/checkout'
import { uploadReceipt } from '../../application/checkout/upload-receipt'
import { approveOrder, loadPendingOrders, rejectOrder } from '../../application/admin-orders/review-order'
import { checkoutRepository } from '../checkout-repository'
import { currentClient, receiptLinks, receiptStorage } from '../receipt-storage'
import { orderReviewRepository } from '../order-review-repository'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']
const SETUP_TIMEOUT_MS = 60_000

const PDF = new TextEncoder().encode('%PDF-1.7\n')

const isLocalHost = (rawUrl: string): boolean => {
  try {
    return LOCAL_HOSTS.includes(new URL(rawUrl).hostname)
  } catch {
    return false
  }
}
const isLocalSetup = Boolean(API_URL && ANON_KEY) && isLocalHost(API_URL) && isLocalHost(DB_URL)

async function isReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/rest/v1/`, { headers: { apikey: ANON_KEY } })
    if (response.status >= 500) return false
    const probe = new PgClient({ connectionString: DB_URL })
    await probe.connect()
    await probe.end()
    return true
  } catch {
    return false
  }
}

const reachable = isLocalSetup && (await isReachable())
if (!reachable) {
  console.warn('[store/db] Supabase local no disponible — prueba de checkout y revisión omitida.')
}

type SignedUpUser = { userId: string; client: SupabaseClient }

async function signUp(emailPrefix: string): Promise<SignedUpUser> {
  const anon = createClient(API_URL, ANON_KEY)
  const { data, error } = await anon.auth.signUp({
    email: `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session || !data.user) {
    throw new Error(`no se pudo crear la cuenta de prueba: ${error?.message ?? 'sin sesión'}`)
  }
  const client = createClient(API_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  return { userId: data.user.id, client }
}

const checkoutFor = (db: SupabaseClient) =>
  checkout({
    upload: uploadReceipt({ storage: receiptStorage(db), currentClient: currentClient(db), newId: () => crypto.randomUUID() }),
    repo: checkoutRepository(db),
  })

describe.skipIf(!reachable)('US-SHOP-02 checkout y revisión contra Supabase local (SEC-002)', () => {
  let admin: PgClient
  let staff: SignedUpUser
  let ana: SignedUpUser
  let anaClientId = ''
  let productId = ''

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()

    staff = await signUp('shop02-staff')
    ana = await signUp('shop02-ana')
    await admin.query(`UPDATE public.auth_user_roles SET role = 'admin' WHERE user_id = $1`, [staff.userId])

    const anaProfile = await admin.query(
      `INSERT INTO public.clients_profiles (user_id, full_name, email, phone) VALUES ($1, 'Ana Pérez', $2, '88880001') RETURNING id`,
      [ana.userId, `${ana.userId}@lashary.test`],
    )
    anaClientId = anaProfile.rows[0].id

    const product = await admin.query(
      `INSERT INTO public.store_products (slug, nombre, descripcion, url_imagen, precio_crc, activo, existencias)
       VALUES ('shop02-serum-' || gen_random_uuid()::text, 'Serum de prueba', '', '/s.jpg', 1500, true, 5)
       RETURNING id`,
    )
    productId = product.rows[0].id
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    await admin?.end()
  })

  it('la clienta finaliza la compra: sube el comprobante, crea el pedido y descuenta existencias', async () => {
    await admin.query(
      `INSERT INTO public.store_cart_items (user_id, product_id, cantidad) VALUES ($1, $2, 2)
         ON CONFLICT (user_id, product_id) DO UPDATE SET cantidad = 2`,
      [ana.userId, productId],
    )

    const result = await checkoutFor(ana.client)({
      contactPhone: '88880001',
      deliveryMethod: 'pickup',
      deliveryAddress: null,
      receipt: PDF,
    })
    expect(isOk(result)).toBe(true)
    const orderId = isOk(result) ? result.value : ''

    const order = await admin.query(`SELECT state, total_crc FROM public.store_orders WHERE id = $1`, [orderId])
    expect(order.rows[0].state).toBe('pending_approval')
    expect(Number(order.rows[0].total_crc)).toBe(3000)

    const stock = await admin.query(`SELECT existencias FROM public.store_products WHERE id = $1`, [productId])
    expect(stock.rows[0].existencias).toBe(3)

    const cart = await admin.query(`SELECT count(*)::int AS n FROM public.store_cart_items WHERE user_id = $1`, [ana.userId])
    expect(cart.rows[0].n).toBe(0)
  })

  it('la administradora ve el pedido en la cola, con la clienta y sus líneas, y lo aprueba', async () => {
    const queue = await loadPendingOrders(orderReviewRepository(staff.client))(50)
    expect(isOk(queue)).toBe(true)
    const pending = isOk(queue) ? queue.value : []
    const item = pending.find((order) => order.clientId === anaClientId)
    expect(item).toBeDefined()
    expect(item?.clientName).toBe('Ana Pérez')
    expect(item?.totalColones).toBe(3000)
    expect(item?.lines).toEqual([
      expect.objectContaining({ productId, productName: 'Serum de prueba', quantity: 2 }),
    ])

    const approved = await approveOrder(orderReviewRepository(staff.client))(item!.id)
    expect(isOk(approved)).toBe(true)

    const after = await admin.query(`SELECT state FROM public.store_orders WHERE id = $1`, [item!.id])
    expect(after.rows[0].state).toBe('approved')
  })

  it('un comprobante de la clienta se ve con una URL firmada', async () => {
    const order = await admin.query(`SELECT receipt_path FROM public.store_orders WHERE client_id = $1 LIMIT 1`, [anaClientId])
    const links = await receiptLinks(staff.client).signedUrls([order.rows[0].receipt_path])
    expect(isOk(links) && links.value.size).toBe(1)
  })

  it('la administradora rechaza un pedido y las existencias vuelven', async () => {
    await admin.query(
      `INSERT INTO public.store_cart_items (user_id, product_id, cantidad) VALUES ($1, $2, 1)
         ON CONFLICT (user_id, product_id) DO UPDATE SET cantidad = 1`,
      [ana.userId, productId],
    )
    const checkedOut = await checkoutFor(ana.client)({
      contactPhone: '88880001',
      deliveryMethod: 'pickup',
      deliveryAddress: null,
      receipt: PDF,
    })
    expect(isOk(checkedOut)).toBe(true)
    const orderId = isOk(checkedOut) ? checkedOut.value : ''

    const stockBefore = await admin.query(`SELECT existencias FROM public.store_products WHERE id = $1`, [productId])
    expect(stockBefore.rows[0].existencias).toBe(2)

    const rejected = await rejectOrder(orderReviewRepository(staff.client))(orderId, 'El comprobante no corresponde al monto')
    expect(isOk(rejected)).toBe(true)

    const stockAfter = await admin.query(`SELECT existencias FROM public.store_products WHERE id = $1`, [productId])
    expect(stockAfter.rows[0].existencias).toBe(3)

    const queue = await loadPendingOrders(orderReviewRepository(staff.client))(50)
    const stillPending = isOk(queue) ? queue.value.some((order) => order.id === orderId) : true
    expect(stillPending).toBe(false)
  })

  it('una clienta no aprueba pedidos', async () => {
    const result = await approveOrder(orderReviewRepository(ana.client))('00000000-0000-0000-0000-000000000000')
    expect(isErr(result) && result.error.code).toBe('STORE_NO_ES_ADMINISTRADORA')
  })
})
