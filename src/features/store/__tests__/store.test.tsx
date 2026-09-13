import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CADENAS_GRID_PRODUCTOS_ES,
  CatalogoProductosDb,
  estadoGridProductosInicial,
  obtenerEstadoGridProductos,
  renderGridProductosPublicos,
  type CatalogoProductosPublico,
} from '@/features/store'
import ProductosPage from '@/app/productos/page'

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
    const catalogo: CatalogoProductosPublico = {
      listarProductosPublicos: vi.fn().mockResolvedValue([
        { id: '1', nombre: 'Activo', urlImagen: '/a.jpg', precioCrc: 1000, activo: true },
        { id: '2', nombre: 'Inactivo', urlImagen: '/b.jpg', precioCrc: 2000, activo: false },
      ]),
    }

    const estado = await obtenerEstadoGridProductos(catalogo, CADENAS_GRID_PRODUCTOS_ES)

    expect(estado.tipo).toBe('listo')
    if (estado.tipo === 'listo') {
      expect(estado.tarjetas).toHaveLength(1)
      expect(estado.tarjetas[0]).toMatchObject({
        id: '1',
        nombre: 'Activo',
        urlImagen: '/a.jpg',
      })
      expect(estado.tarjetas[0].etiquetaPrecio).toContain('₡')
    }
  })

  it('devuelve estado vacío cuando no hay productos activos', async () => {
    const catalogo: CatalogoProductosPublico = {
      listarProductosPublicos: vi.fn().mockResolvedValue([
        { id: '1', nombre: 'Uno', urlImagen: '/a.jpg', precioCrc: 1000, activo: false },
      ]),
    }

    const estado = await obtenerEstadoGridProductos(catalogo, CADENAS_GRID_PRODUCTOS_ES)

    expect(estado).toEqual({
      tipo: 'vacio',
      titulo: CADENAS_GRID_PRODUCTOS_ES.tituloVacio,
      descripcion: CADENAS_GRID_PRODUCTOS_ES.descripcionVacio,
    })
  })

  it('devuelve estado de error cuando el catálogo falla', async () => {
    const catalogo: CatalogoProductosPublico = {
      listarProductosPublicos: vi.fn().mockRejectedValue(new Error('cms offline')),
    }

    const estado = await obtenerEstadoGridProductos(catalogo, CADENAS_GRID_PRODUCTOS_ES)

    expect(estado).toEqual({
      tipo: 'error',
      titulo: CADENAS_GRID_PRODUCTOS_ES.tituloError,
      descripcion: CADENAS_GRID_PRODUCTOS_ES.descripcionError,
      etiquetaReintentar: CADENAS_GRID_PRODUCTOS_ES.etiquetaReintentar,
    })
  })

  it('renderiza el grid con accesibilidad, escape y reintento seguro', () => {
    const html = renderGridProductosPublicos(
      {
        tipo: 'listo',
        tarjetas: [
          {
            id: '1',
            nombre: '<script>alert(1)</script>',
            urlImagen: 'javascript:alert(1)',
            etiquetaPrecio: '₡18.000',
          },
        ],
      },
      { urlReintento: 'javascript:alert(1)' }
    )

    expect(html).toContain('aria-label="Catálogo de productos de mantenimiento"')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('javascript:alert(1)')
  })

  it('integra la ruta pública /productos con el feature store', async () => {
    const page = await ProductosPage()
    const html = renderToStaticMarkup(page)

    expect(html).toContain('aria-label="Catálogo de productos de mantenimiento"')
    expect(html).toContain('Serum nutritivo Lashary')
    expect(html).toContain('Cepillo limpiador Lashary')
  })

  it('lee los productos desde la base de datos para la ruta pública', async () => {
    const catalogo = new CatalogoProductosDb()
    const productos = await catalogo.listarProductosPublicos()

    expect(productos).toHaveLength(2)
    expect(productos[0].nombre).toBe('Serum nutritivo Lashary')
    expect(productos[1].nombre).toBe('Cepillo limpiador Lashary')
  })

  it('la ruta /productos renderiza múltiples productos provenientes de la base', async () => {
    const page = await ProductosPage()
    const html = renderToStaticMarkup(page)

    expect(html).toContain('Serum nutritivo Lashary')
    expect(html).toContain('Cepillo limpiador Lashary')
  })
})
