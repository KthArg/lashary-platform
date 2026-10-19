import { describe, it, expect } from 'vitest'
import { ok, err } from '@/shared/result'
import { RECORD_IMAGE_MAX_BYTES, recordImageExtension } from '../record-image'

describe('recordImageExtension — qué imagen entra al expediente (criterio 1)', () => {
  it('acepta JPEG, PNG y WebP con su extensión', () => {
    expect(recordImageExtension('image/jpeg', 10)).toEqual(ok('jpg'))
    expect(recordImageExtension('image/png', 10)).toEqual(ok('png'))
    expect(recordImageExtension('image/webp', 10)).toEqual(ok('webp'))
  })

  it('rechaza cualquier otro tipo', () => {
    expect(recordImageExtension('application/pdf', 10)).toEqual(err('image-type-not-allowed'))
  })

  it('acepta justo el tope del bucket y rechaza un byte más', () => {
    expect(recordImageExtension('image/png', RECORD_IMAGE_MAX_BYTES)).toEqual(ok('png'))
    expect(recordImageExtension('image/png', RECORD_IMAGE_MAX_BYTES + 1)).toEqual(err('image-too-large'))
  })

  it('rechaza un archivo vacío', () => {
    expect(recordImageExtension('image/png', 0)).toEqual(err('image-empty'))
  })
})
