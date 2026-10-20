import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Money } from '@/shared/money'
import {
  createFakeCartRepository,
  makeCartProduct,
  type FakeCartRepository,
} from '@/features/store/application/cart/__tests__/fake-cart-repository'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  repo: null as FakeCartRepository | null,
}))

vi.mock('@/features/auth', () => ({
  getAuthSession: mocks.getAuthSession,
  AUTH_LABELS: { clientPortalTitle: 'Portal Clienta' },
  CLIENT_PORTAL_ROUTES: { carrito: '/portal/carrito' },
}))
vi.mock('@/features/store/db/cart-repository', () => ({
  cartRepository: vi.fn(async () => mocks.repo),
}))

import CartRoute, { metadata } from '@/app/portal/carrito/page'
import Loading from '@/app/portal/carrito/loading'
import ErrorView from '@/app/portal/carrito/error'
import { CART_PAGE_STRINGS, formatPriceCrc } from '@/features/store'

const CUSTOMER_ID = 'clienta-a'
const OTHER_CUSTOMER_ID = 'clienta-b'
const SERUM_PRICE = 18000
const BRUSH_PRICE = 12000
const SERUM_QUANTITY = 2

const serum = makeCartProduct({ unitPrice: Money.fromColones(SERUM_PRICE) })
const brush = makeCartProduct({
  id: 'producto-cepillo',
  slug: 'cepillo-limpiador-lashary',
  name: 'Cepillo limpiador Lashary',
  unitPrice: Money.fromColones(BRUSH_PRICE),
})

async function renderCartRoute(): Promise<string> {
  return renderToStaticMarkup(await CartRoute())
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.repo = createFakeCartRepository([serum, brush])
  mocks.getAuthSession.mockResolvedValue({ user: { id: CUSTOMER_ID }, role: 'cliente' })
})

describe('US-SHOP-01: página /portal/carrito', () => {
  it('muestra cada producto con su cantidad, su total y el subtotal del carrito', async () => {
    await mocks.repo?.saveQuantity(CUSTOMER_ID, serum.id, SERUM_QUANTITY)
    await mocks.repo?.saveQuantity(CUSTOMER_ID, brush.id, 1)

    const html = await renderCartRoute()

    expect(html).toContain(serum.name)
    expect(html).toContain(brush.name)
    expect(html).toContain(CART_PAGE_STRINGS.quantity(SERUM_QUANTITY))
    expect(html).toContain(CART_PAGE_STRINGS.unitPrice(formatPriceCrc(SERUM_PRICE)))
    expect(html).toContain(formatPriceCrc(SERUM_PRICE * SERUM_QUANTITY))
    expect(html).toContain(CART_PAGE_STRINGS.subtotal)
    expect(html).toContain(formatPriceCrc(SERUM_PRICE * SERUM_QUANTITY + BRUSH_PRICE))
  })

  it('cada línea enlaza al detalle del producto y su imagen lleva texto alternativo', async () => {
    await mocks.repo?.saveQuantity(CUSTOMER_ID, serum.id, 1)

    const html = await renderCartRoute()

    expect(html).toContain(`href="/productos/${serum.slug}"`)
    expect(html).toContain(`alt="${CART_PAGE_STRINGS.productAltPrefix} ${serum.name}"`)
  })

  it('con el carrito vacío muestra el aviso y el enlace a la tienda', async () => {
    const html = await renderCartRoute()

    expect(html).toContain(CART_PAGE_STRINGS.emptyTitle)
    expect(html).toContain('href="/productos"')
    expect(html).not.toContain(CART_PAGE_STRINGS.subtotal)
  })

  it('no muestra el carrito de otra clienta', async () => {
    await mocks.repo?.saveQuantity(OTHER_CUSTOMER_ID, serum.id, 3)

    const html = await renderCartRoute()

    expect(html).toContain(CART_PAGE_STRINGS.emptyTitle)
    expect(html).not.toContain(serum.name)
  })

  it('el título de la pestaña nombra el carrito', () => {
    expect(metadata.title).toContain(CART_PAGE_STRINGS.title)
  })

  it('los estados de carga y error se anuncian y el error ofrece reintentar', () => {
    const loading = renderToStaticMarkup(<Loading />)
    expect(loading).toContain('role="status"')
    expect(loading).toContain(CART_PAGE_STRINGS.loading)

    const error = renderToStaticMarkup(<ErrorView error={new Error('caída')} reset={() => {}} />)
    expect(error).toContain('role="alert"')
    expect(error).toContain(CART_PAGE_STRINGS.retry)
  })
})
