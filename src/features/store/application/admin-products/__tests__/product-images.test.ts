import { describe, it, expect, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  uploadProductImage,
  removeStoredProductImage,
  type ProductImageDeps,
} from '@/features/store/application/admin-products/product-images'

const BUCKET_URL = 'http://localhost:54321/storage/v1/object/public/store-product-images/'
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

function fakeDeps(): ProductImageDeps & {
  storage: { upload: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }
} {
  return {
    newFileId: () => 'archivo-1',
    storage: {
      upload: vi.fn(async (path: string) => `${BUCKET_URL}${path}`),
      remove: vi.fn(async () => undefined),
      pathFromUrl: (url: string) => (url.startsWith(BUCKET_URL) ? url.slice(BUCKET_URL.length) : null),
    },
  }
}

describe('uploadProductImage', () => {
  it('sube una imagen válida a la carpeta del producto y devuelve su URL pública', async () => {
    const deps = fakeDeps()
    const result = await uploadProductImage(deps)('producto-1', PNG_BYTES)
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(deps.storage.upload).toHaveBeenCalledWith('producto-1/archivo-1.png', PNG_BYTES, 'image/png')
    expect(result.value).toBe(`${BUCKET_URL}producto-1/archivo-1.png`)
  })

  it('DOM-008: no sube un archivo que no es imagen', async () => {
    const deps = fakeDeps()
    const fake = new TextEncoder().encode('no soy una foto')
    const result = await uploadProductImage(deps)('producto-1', fake)
    expect(isErr(result)).toBe(true)
    expect(deps.storage.upload).not.toHaveBeenCalled()
  })
})

describe('removeStoredProductImage', () => {
  it('borra del bucket una imagen que vive en él', async () => {
    const deps = fakeDeps()
    await removeStoredProductImage(deps)(`${BUCKET_URL}producto-1/viejo.png`)
    expect(deps.storage.remove).toHaveBeenCalledWith('producto-1/viejo.png')
  })

  it('no toca un link externo cargado a mano antes de existir el bucket', async () => {
    const deps = fakeDeps()
    await removeStoredProductImage(deps)('https://ejemplo.com/foto.jpg')
    expect(deps.storage.remove).not.toHaveBeenCalled()
  })
})
