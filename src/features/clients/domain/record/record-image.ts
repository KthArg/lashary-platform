import { ok, err, type Result } from '@/shared/result'

export const RECORD_IMAGE_MAX_BYTES = 1000000

export const RECORD_IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export type RecordImageProblem = 'image-empty' | 'image-too-large' | 'image-type-not-allowed'

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46]
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50]
const WEBP_SIGNATURE_OFFSET = 8

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  signature.every((byte, index) => bytes[offset + index] === byte)

export function detectImageType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, JPEG_SIGNATURE)) return 'image/jpeg'
  if (startsWith(bytes, PNG_SIGNATURE)) return 'image/png'
  if (startsWith(bytes, RIFF_SIGNATURE) && startsWith(bytes, WEBP_SIGNATURE, WEBP_SIGNATURE_OFFSET)) return 'image/webp'
  return null
}

export function recordImageExtension(contentType: string, size: number): Result<string, RecordImageProblem> {
  if (size <= 0) return err('image-empty')
  if (size > RECORD_IMAGE_MAX_BYTES) return err('image-too-large')
  const extension = RECORD_IMAGE_EXTENSIONS[contentType]
  return extension ? ok(extension) : err('image-type-not-allowed')
}
