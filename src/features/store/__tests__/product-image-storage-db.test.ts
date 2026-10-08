import { beforeEach, describe, expect, it, vi } from 'vitest'
import { productImageStorage } from '@/features/store/db/product-image-storage'

const PUBLIC_PREFIX = 'http://localhost:54321/storage/v1/object/public/store-product-images/'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: async () => ({ storage: { from: mocks.from } }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.from.mockReturnValue({
    upload: mocks.upload,
    remove: mocks.remove,
    getPublicUrl: (path: string) => ({ data: { publicUrl: encodeURI(`${PUBLIC_PREFIX}${path}`) } }),
  })
  mocks.upload.mockResolvedValue({ data: {}, error: null })
  mocks.remove.mockResolvedValue({ data: [], error: null })
})

describe('productImageStorage', () => {
  it('sube al bucket de productos sin pisar archivos existentes y devuelve la URL pública', async () => {
    const storage = await productImageStorage()
    const bytes = new Uint8Array([1, 2, 3])

    const url = await storage.upload('p-1/a.png', bytes, 'image/png')

    expect(mocks.from).toHaveBeenCalledWith('store-product-images')
    expect(mocks.upload).toHaveBeenCalledWith('p-1/a.png', bytes, { contentType: 'image/png', upsert: false })
    expect(url).toBe(`${PUBLIC_PREFIX}p-1/a.png`)
  })

  it('lanza si Storage rechaza la subida', async () => {
    mocks.upload.mockResolvedValueOnce({ data: null, error: { message: 'new row violates row-level security policy' } })
    const storage = await productImageStorage()

    await expect(storage.upload('p-1/a.png', new Uint8Array([1]), 'image/png')).rejects.toThrow(
      'store-product-images.upload',
    )
  })

  it('reconoce la ruta de una URL de su bucket, aunque tenga caracteres codificados', async () => {
    const storage = await productImageStorage()

    expect(storage.pathFromUrl(`${PUBLIC_PREFIX}p-1/a.png`)).toBe('p-1/a.png')
    expect(storage.pathFromUrl(encodeURI(`${PUBLIC_PREFIX}p-1/foto nueva.png`))).toBe('p-1/foto nueva.png')
  })

  it('no reconoce como suya una URL externa ni el prefijo vacío', async () => {
    const storage = await productImageStorage()

    expect(storage.pathFromUrl('https://ejemplo.com/foto.jpg')).toBeNull()
    expect(storage.pathFromUrl(PUBLIC_PREFIX)).toBeNull()
  })

  it('borra una ruta del bucket', async () => {
    const storage = await productImageStorage()

    await storage.remove('p-1/a.png')

    expect(mocks.remove).toHaveBeenCalledWith(['p-1/a.png'])
  })
})
