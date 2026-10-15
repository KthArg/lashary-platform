import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PublicProductDetail } from '@/features/store'

const mocks = vi.hoisted(() => ({
  addToCartAction: vi.fn(),
  getAuthSession: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('@/features/store/ui/cart/actions/cart-actions', () => ({
  addToCartAction: mocks.addToCartAction,
}))
vi.mock('@/features/auth', () => ({
  getAuthSession: mocks.getAuthSession,
  AUTH_ROLES: { CLIENTE: 'cliente' },
  CLIENT_PORTAL_ROUTES: { carrito: '/portal/carrito' },
}))
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: async () => {
    const filters = { eq: () => filters, maybeSingle: mocks.maybeSingle }
    return { from: () => ({ select: () => filters }) }
  },
}))

import { ProductDetail, PUBLIC_DETAIL_STRINGS } from '@/features/store'
import ProductDetailPage from '@/app/(site)/productos/[slug]/page'
import { CART_STRINGS } from '@/features/store/ui/cart/constants/cart-strings'

const SERUM_ID = '2d4f6a8c-1b3e-4d5f-8a7c-9e0b1c2d3e4f'
const SERUM_SLUG = 'serum-nutritivo-lashary'

const serum: PublicProductDetail = {
  id: SERUM_ID,
  slug: SERUM_SLUG,
  name: 'Serum nutritivo Lashary',
  description: 'Tratamiento nutritivo para pestañas.',
  imageUrl: '/productos/serum-nutritivo.jpg',
  priceLabel: '₡18 000',
  isAvailable: true,
}

const serumRow = {
  id: SERUM_ID,
  slug: SERUM_SLUG,
  nombre: serum.name,
  descripcion: serum.description,
  url_imagen: serum.imageUrl,
  precio_crc: 18000,
  existencias: 4,
  activo: true,
}

async function renderRoute(): Promise<string> {
  return renderToStaticMarkup(
    await ProductDetailPage({ params: Promise.resolve({ slug: SERUM_SLUG }) }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.maybeSingle.mockResolvedValue({ data: serumRow, error: null })
})
afterEach(cleanup)

describe('US-SHOP-01: agregar al carrito desde el detalle del producto', () => {
  it('criterio 1: la clienta con sesión agrega el producto y ve la confirmación', async () => {
    mocks.addToCartAction.mockResolvedValue({ status: 'ok', message: CART_STRINGS.added })
    render(<ProductDetail detail={serum} purchaseAccess="customer" />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: PUBLIC_DETAIL_STRINGS.addToCart }))
    })

    const form: FormData = mocks.addToCartAction.mock.calls[0][1]
    expect(form.get('productId')).toBe(SERUM_ID)
    expect(screen.getByRole('status').textContent).toBe(CART_STRINGS.added)
    expect(screen.getByRole('link', { name: PUBLIC_DETAIL_STRINGS.viewCart }).getAttribute('href')).toBe(
      '/portal/carrito',
    )
  })

  it('sin sesión, el botón lleva a iniciar sesión y no toca el carrito', () => {
    const html = renderToStaticMarkup(<ProductDetail detail={serum} purchaseAccess="guest" />)

    expect(html).toContain('action="/login"')
    expect(html).toMatch(/<button type="submit"[^>]*>Agregar al carrito<\/button>/)
    expect(html).toContain(PUBLIC_DETAIL_STRINGS.signInToBuy)
    expect(mocks.addToCartAction).not.toHaveBeenCalled()
  })

  it('agotado gana aunque la clienta tenga sesión: el botón queda deshabilitado', () => {
    const html = renderToStaticMarkup(
      <ProductDetail detail={{ ...serum, isAvailable: false }} purchaseAccess="customer" />,
    )

    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Agregar al carrito<\/button>/)
    expect(html).not.toContain('name="productId"')
  })

  it('la ruta ofrece agregar a una clienta con sesión', async () => {
    mocks.getAuthSession.mockResolvedValue({ user: { id: 'clienta-a' }, role: 'cliente' })

    const html = await renderRoute()

    expect(html).toContain(`name="productId" value="${SERUM_ID}"`)
    expect(html).not.toContain('action="/login"')
  })

  it('la ruta manda al login a quien no tiene sesión o no es clienta', async () => {
    mocks.getAuthSession.mockResolvedValueOnce(null)
    expect(await renderRoute()).toContain('action="/login"')

    mocks.getAuthSession.mockResolvedValueOnce({ user: { id: 'admin-a' }, role: 'admin' })
    expect(await renderRoute()).toContain('action="/login"')
  })
})
