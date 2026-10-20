import { describe, it, expect } from 'vitest'
import { ok, err } from '@/shared/result'
import { RECORD_IMAGE_MAX_BYTES, detectImageType, recordImageExtension } from '../record-image'

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

describe('detectImageType — el tipo sale de los primeros bytes, no del nombre (B9)', () => {
  const bytes = (...values: number[]) => new Uint8Array(values)

  it('reconoce JPEG, PNG y WebP por su firma', () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png')
    expect(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe('image/webp')
  })

  it('cualquier otra cosa no es una imagen permitida', () => {
    expect(detectImageType(new TextEncoder().encode('%PDF-1.7'))).toBeNull()
    expect(detectImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20))).toBeNull()
  })
})
