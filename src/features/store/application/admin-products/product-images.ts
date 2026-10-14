import { ok, isErr, type Result } from '@/shared/result'
import { productImagePath, validateProductImage } from '../../domain/product-image'
import type { InvalidProductImage } from '../../domain/product-errors'
import type { ProductImageStorage } from './ports'

export type ProductImageDeps = {
  storage: ProductImageStorage
  newFileId: () => string
}

export const uploadProductImage =
  (deps: ProductImageDeps) =>
  async (productId: string, bytes: Uint8Array): Promise<Result<string, InvalidProductImage>> => {
    const validated = validateProductImage(bytes)
    if (isErr(validated)) return validated

    const { format } = validated.value
    const path = productImagePath(productId, deps.newFileId(), format)
    const publicUrl = await deps.storage.upload(path, bytes, format.contentType)
    return ok(publicUrl)
  }

export const removeStoredProductImage =
  (deps: ProductImageDeps) =>
  async (url: string): Promise<void> => {
    const path = deps.storage.pathFromUrl(url)
    if (path === null) return
    await deps.storage.remove(path)
  }
