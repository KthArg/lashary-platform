import { ok, err, type Result } from '@/shared/result'
import { createInvalidProductImage, type InvalidProductImage } from './product-errors'

export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024

export type ProductImageFormat = {
  extension: 'jpg' | 'png' | 'webp'
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
}

export type ValidProductImage = {
  bytes: Uint8Array
  format: ProductImageFormat
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46]
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50]
const WEBP_SIGNATURE_OFFSET = 8

const JPEG: ProductImageFormat = { extension: 'jpg', contentType: 'image/jpeg' }
const PNG: ProductImageFormat = { extension: 'png', contentType: 'image/png' }
const WEBP: ProductImageFormat = { extension: 'webp', contentType: 'image/webp' }

function hasSignature(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

export function detectImageFormat(bytes: Uint8Array): ProductImageFormat | null {
  if (hasSignature(bytes, JPEG_SIGNATURE)) return JPEG
  if (hasSignature(bytes, PNG_SIGNATURE)) return PNG
  if (hasSignature(bytes, RIFF_SIGNATURE) && hasSignature(bytes, WEBP_SIGNATURE, WEBP_SIGNATURE_OFFSET)) {
    return WEBP
  }
  return null
}

export function validateProductImage(
  bytes: Uint8Array,
): Result<ValidProductImage, InvalidProductImage> {
  if (bytes.length === 0) return err(createInvalidProductImage(['la imagen está vacía']))
  if (bytes.length > MAX_PRODUCT_IMAGE_BYTES) {
    return err(createInvalidProductImage(['la imagen pesa más de 2 MB']))
  }

  const format = detectImageFormat(bytes)
  if (format === null) {
    return err(createInvalidProductImage(['el archivo no es una imagen JPEG, PNG ni WebP']))
  }
  return ok({ bytes, format })
}

export function productImagePath(
  productId: string,
  fileId: string,
  format: ProductImageFormat,
): string {
  return `${productId}/${fileId}.${format.extension}`
}
