import { ok, err, type Result } from '@/shared/result'

export const RECORD_IMAGE_MAX_BYTES = 1048576

export const RECORD_IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export type RecordImageProblem = 'image-empty' | 'image-too-large' | 'image-type-not-allowed'

export function recordImageExtension(contentType: string, size: number): Result<string, RecordImageProblem> {
  if (size <= 0) return err('image-empty')
  if (size > RECORD_IMAGE_MAX_BYTES) return err('image-too-large')
  const extension = RECORD_IMAGE_EXTENSIONS[contentType]
  return extension ? ok(extension) : err('image-type-not-allowed')
}
