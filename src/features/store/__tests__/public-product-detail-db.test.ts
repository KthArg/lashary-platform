import { beforeEach, describe, expect, it, vi } from 'vitest'
import { publicProductDetailDb } from '@/features/store'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: async () => ({ from: mocks.from }),
}))

const serumRow = {
  slug: 'serum-nutritivo-lashary',
  nombre: 'Serum nutritivo Lashary',
  descripcion: 'Tratamiento nutritivo para pestañas.',
  url_imagen: '/productos/serum-nutritivo.jpg',
  precio_crc: '18000',
  existencias: 0,
  activo: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  const filters = { eq: mocks.eq, maybeSingle: mocks.maybeSingle }
  mocks.from.mockReturnValue({ select: mocks.select })
  mocks.select.mockReturnValue(filters)
  mocks.eq.mockReturnValue(filters)
  mocks.maybeSingle.mockResolvedValue({ data: serumRow, error: null })
})

describe('publicProductDetailDb', () => {
  it('busca por slug y solo entre productos activos', async () => {
    await publicProductDetailDb().findBySlug('serum-nutritivo-lashary')
    expect(mocks.from).toHaveBeenCalledWith('store_products')
    expect(mocks.eq).toHaveBeenCalledWith('slug', 'serum-nutritivo-lashary')
    expect(mocks.eq).toHaveBeenCalledWith('activo', true)
  })

  it('traduce la fila de la base a los nombres del dominio', async () => {
    const source = await publicProductDetailDb().findBySlug('serum-nutritivo-lashary')
    expect(source).toEqual({
      slug: 'serum-nutritivo-lashary',
      name: 'Serum nutritivo Lashary',
      description: 'Tratamiento nutritivo para pestañas.',
      imageUrl: '/productos/serum-nutritivo.jpg',
      priceCrc: 18000,
      stock: 0,
      isActive: true,
    })
  })

  it('devuelve null si no hay fila para ese slug', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect(await publicProductDetailDb().findBySlug('no-existe')).toBeNull()
  })

  it('lanza si la base responde con error, para que la página muestre su estado de error', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'caída' } })
    await expect(publicProductDetailDb().findBySlug('serum-nutritivo-lashary')).rejects.toThrow(
      'store_products.findBySlug: caída',
    )
  })
})
