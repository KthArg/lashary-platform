import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductDetail, PUBLIC_DETAIL_STRINGS, type PublicProductDetail } from '@/features/store'
import ProductDetailPage, { generateMetadata } from '@/app/productos/[slug]/page'
import Loading from '@/app/productos/[slug]/loading'
import ErrorView from '@/app/productos/[slug]/error'
import NotFound from '@/app/productos/[slug]/not-found'

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: async () => {
    const filters = { eq: () => filters, maybeSingle: mocks.maybeSingle }
    return { from: () => ({ select: () => filters }) }
  },
}))

const serumRow = {
  slug: 'serum-nutritivo-lashary',
  nombre: 'Serum nutritivo Lashary',
  descripcion: 'Tratamiento nutritivo para pestañas.',
  url_imagen: '/productos/serum-nutritivo.jpg',
  precio_crc: 18000,
  existencias: 4,
  activo: true,
}

const available: PublicProductDetail = {
  slug: 'serum-nutritivo-lashary',
  name: 'Serum nutritivo Lashary',
  description: 'Tratamiento nutritivo para pestañas.',
  imageUrl: '/productos/serum-nutritivo.jpg',
  priceLabel: '₡18 000',
  isAvailable: true,
}

const params = (slug: string) => ({ params: Promise.resolve({ slug }) })

const renderDetail = (overrides: Partial<PublicProductDetail> = {}) =>
  renderToStaticMarkup(<ProductDetail detail={{ ...available, ...overrides }} />)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.maybeSingle.mockResolvedValue({ data: serumRow, error: null })
})

describe('US-PROD-03: detalle de un producto', () => {
  it('criterio 1: muestra imagen, nombre, descripción y precio', () => {
    const html = renderDetail()

    expect(html).toContain('src="/productos/serum-nutritivo.jpg"')
    expect(html).toContain('alt="Producto: Serum nutritivo Lashary"')
    expect(html).toContain('<h1')
    expect(html).toContain('Serum nutritivo Lashary')
    expect(html).toContain('Tratamiento nutritivo para pestañas.')
    expect(html).toContain('₡18 000')
  })

  it('criterio 2: existe el botón para agregar al carrito, habilitado si hay existencias', () => {
    const html = renderDetail()

    expect(html).toMatch(/<button[^>]*>Agregar al carrito<\/button>/)
    expect(html).not.toMatch(/<button[^>]*disabled/)
    expect(html).toContain(PUBLIC_DETAIL_STRINGS.available)
  })

  it('criterio 3 y UI-004: sin existencias indica "Agotado", deshabilita la compra y el botón lo explica', () => {
    const html = renderDetail({ isAvailable: false })

    expect(html).toContain(PUBLIC_DETAIL_STRINGS.soldOut)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Agregar al carrito<\/button>/)
    expect(html).toContain('id="product-availability"')
    expect(html).toContain('aria-describedby="product-availability"')
  })

  it('la ruta /productos/[slug] lee el producto de la base y lo muestra', async () => {
    const html = renderToStaticMarkup(await ProductDetailPage(params('serum-nutritivo-lashary')))

    expect(html).toContain('Serum nutritivo Lashary')
    expect(html).toContain('Agregar al carrito')
  })

  it('la ruta muestra agotado un producto con existencias en cero', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { ...serumRow, existencias: 0 }, error: null })

    const html = renderToStaticMarkup(await ProductDetailPage(params('serum-nutritivo-lashary')))

    expect(html).toContain(PUBLIC_DETAIL_STRINGS.soldOut)
    expect(html).toMatch(/<button[^>]*disabled=""/)
  })

  it('un slug inexistente responde con el 404 de Next', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

    await expect(ProductDetailPage(params('no-existe'))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalled()
  })

  it('el título de la pestaña lleva el nombre del producto', async () => {
    const metadata = await generateMetadata(params('serum-nutritivo-lashary'))

    expect(metadata.title).toBe(`Serum nutritivo Lashary | ${PUBLIC_DETAIL_STRINGS.pageTitleSuffix}`)
  })
})

describe('US-PROD-03: estados de la ruta de detalle (UI-003)', () => {
  it('carga: anuncia que el producto se está cargando', () => {
    const html = renderToStaticMarkup(<Loading />)

    expect(html).toContain('role="status"')
    expect(html).toContain(PUBLIC_DETAIL_STRINGS.loading)
  })

  it('error: avisa del fallo y ofrece reintentar', () => {
    const html = renderToStaticMarkup(<ErrorView error={new Error('caída')} reset={() => {}} />)

    expect(html).toContain('role="alert"')
    expect(html).toContain(PUBLIC_DETAIL_STRINGS.errorTitle)
    expect(html).toContain(PUBLIC_DETAIL_STRINGS.retry)
  })

  it('no encontrado: lo dice y ofrece volver al catálogo', () => {
    const html = renderToStaticMarkup(<NotFound />)

    expect(html).toContain(PUBLIC_DETAIL_STRINGS.notFoundTitle)
    expect(html).toContain('href="/productos"')
  })
})
