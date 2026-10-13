import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  PUBLIC_GRID_STRINGS,
  publicProductsDb,
  PublicProductsGrid,
  initialProductGridState,
  getProductGridState,
  type PublicProductCatalog,
} from '@/features/store'
import ProductsPage from '@/app/productos/page'

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrderSecond = vi.fn()
const mockOrderFirst = vi.fn()
const mockFrom = vi.fn()
const mockCreateClient = vi.fn()
const mockDbRows = [
  {
    id: 'producto-01',
    nombre: 'Serum nutritivo Lashary',
    url_imagen: '/productos/serum-nutritivo.jpg',
    precio_crc: 18000,
    activo: true,
  },
  {
    id: 'producto-02',
    nombre: 'Cepillo limpiador Lashary',
    url_imagen: '/productos/cepillo-limpiador.jpg',
    precio_crc: 12000,
    activo: true,
  },
]

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

beforeEach(() => {
  mockOrderSecond.mockResolvedValue({ data: mockDbRows, error: null })
  mockOrderFirst.mockImplementation(() => ({
    order: mockOrderSecond,
  }))
  mockEq.mockImplementation(() => ({
    order: mockOrderFirst,
  }))
  mockSelect.mockImplementation(() => ({
    eq: mockEq,
  }))
  mockFrom.mockImplementation(() => ({
    select: mockSelect,
  }))
  mockCreateClient.mockResolvedValue({
    from: mockFrom,
  })
})

describe('US-PROD-02: productos públicos en cuadricula', () => {
  it('filtra productos inactivos y convierte los activos en tarjetas', async () => {
    const catalog: PublicProductCatalog = {
      listPublicProducts: vi.fn().mockResolvedValue([
        { id: '1', name: 'Activo', imageUrl: '/a.jpg', priceCrc: 1000, isActive: true },
        { id: '2', name: 'Inactivo', imageUrl: '/b.jpg', priceCrc: 2000, isActive: false },
      ]),
    }

    const state = await getProductGridState(catalog, PUBLIC_GRID_STRINGS)

    expect(state.kind).toBe('ready')
    if (state.kind === 'ready') {
      expect(state.cards).toHaveLength(1)
      expect(state.cards[0]).toMatchObject({
        id: '1',
        name: 'Activo',
        imageUrl: '/a.jpg',
      })
      expect(state.cards[0].priceLabel).toContain('₡')
    }
  })

  it('devuelve estado vacío cuando no hay productos activos', async () => {
    const catalog: PublicProductCatalog = {
      listPublicProducts: vi.fn().mockResolvedValue([
        { id: '1', name: 'Uno', imageUrl: '/a.jpg', priceCrc: 1000, isActive: false },
      ]),
    }

    const state = await getProductGridState(catalog, PUBLIC_GRID_STRINGS)

    expect(state).toEqual({
      kind: 'empty',
      title: PUBLIC_GRID_STRINGS.emptyTitle,
      description: PUBLIC_GRID_STRINGS.emptyDescription,
    })
  })

  it('devuelve estado de error cuando el catálogo falla', async () => {
    const catalog: PublicProductCatalog = {
      listPublicProducts: vi.fn().mockRejectedValue(new Error('cms offline')),
    }

    const state = await getProductGridState(catalog, PUBLIC_GRID_STRINGS)

    expect(state).toEqual({
      kind: 'error',
      title: PUBLIC_GRID_STRINGS.errorTitle,
      description: PUBLIC_GRID_STRINGS.errorDescription,
      retryLabel: PUBLIC_GRID_STRINGS.retryLabel,
    })
  })

  it('renderiza el grid con accesibilidad, escape de contenido y URL de imagen sanitizada', async () => {
    const catalog: PublicProductCatalog = {
      listPublicProducts: vi.fn().mockResolvedValue([
        {
          id: '1',
          name: '<script>alert(1)</script>',
          imageUrl: 'javascript:alert(1)',
          priceCrc: 18000,
          isActive: true,
        },
      ]),
    }
    const state = await getProductGridState(catalog, PUBLIC_GRID_STRINGS)
    const html = renderToStaticMarkup(<PublicProductsGrid state={state} />)

    expect(html).toContain('aria-label="Catálogo de productos de mantenimiento"')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('javascript:alert(1)')
  })

  it('el grid es responsivo: una columna en móvil, dos desde sm y tres desde lg', async () => {
    const catalog: PublicProductCatalog = {
      listPublicProducts: vi.fn().mockResolvedValue(mockDbRows.map((row) => ({
        id: row.id,
        name: row.nombre,
        imageUrl: row.url_imagen,
        priceCrc: row.precio_crc,
        isActive: row.activo,
      }))),
    }
    const state = await getProductGridState(catalog, PUBLIC_GRID_STRINGS)
    const html = renderToStaticMarkup(<PublicProductsGrid state={state} />)

    expect(html).toMatch(/class="[^"]*\bgrid-cols-1\b[^"]*\bsm:grid-cols-2\b[^"]*\blg:grid-cols-3\b/)
  })

  it('sanitiza una URL de reintento insegura y no la usa como href del botón', () => {
    const html = renderToStaticMarkup(
      <PublicProductsGrid
        state={{
          kind: 'error',
          title: 'No se pudo cargar el catálogo',
          description: 'Inténtalo de nuevo en unos minutos.',
          retryLabel: 'Reintentar',
        }}
        retryUrl="javascript:alert(1)"
      />
    )

    expect(html).not.toContain('javascript:alert(1)')
    expect(html).toContain('disabled')
  })

  it('usa una URL de reintento segura como href del botón de reintento', () => {
    const html = renderToStaticMarkup(
      <PublicProductsGrid
        state={{
          kind: 'error',
          title: 'No se pudo cargar el catálogo',
          description: 'Inténtalo de nuevo en unos minutos.',
          retryLabel: 'Reintentar',
        }}
        retryUrl="/productos"
      />
    )

    expect(html).toContain('href="/productos"')
  })

  it('integra la ruta pública /productos con el feature store', async () => {
    const page = await ProductsPage()
    const html = renderToStaticMarkup(page)

    expect(html).toContain('aria-label="Catálogo de productos de mantenimiento"')
    expect(html).toContain('Serum nutritivo Lashary')
    expect(html).toContain('Cepillo limpiador Lashary')
  })

  it('lee los productos desde la base de datos para la ruta pública', async () => {
    const catalog = publicProductsDb()
    const products = await catalog.listPublicProducts()

    expect(products).toHaveLength(2)
    expect(products[0].name).toBe('Serum nutritivo Lashary')
    expect(products[1].name).toBe('Cepillo limpiador Lashary')
  })

  it('la ruta /productos renderiza múltiples productos provenientes de la base', async () => {
    const page = await ProductsPage()
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Serum nutritivo Lashary')
    expect(html).toContain('Cepillo limpiador Lashary')
  })
})
