import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  MAX_PRODUCT_IMAGE_BYTES,
  detectImageFormat,
  productImagePath,
  validateProductImage,
} from '@/features/store/domain/product-image'

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
])
const TEXT_RENAMED_AS_JPG = new TextEncoder().encode('esto es texto con nombre foto.jpg')
const SVG_BYTES = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')

const withJpegHeader = (size: number) => {
  const bytes = new Uint8Array(size)
  bytes.set(JPEG_BYTES)
  return bytes
}

describe('detectImageFormat (DOM-008: por contenido, no por extensión)', () => {
  it('reconoce JPEG, PNG y WebP por sus primeros bytes', () => {
    expect(detectImageFormat(JPEG_BYTES)?.contentType).toBe('image/jpeg')
    expect(detectImageFormat(PNG_BYTES)?.contentType).toBe('image/png')
    expect(detectImageFormat(WEBP_BYTES)?.contentType).toBe('image/webp')
  })

  it('no reconoce un texto aunque su nombre termine en .jpg', () => {
    expect(detectImageFormat(TEXT_RENAMED_AS_JPG)).toBeNull()
  })

  it('no acepta SVG, que puede traer scripts', () => {
    expect(detectImageFormat(SVG_BYTES)).toBeNull()
  })

  it('un RIFF que no es WebP (por ejemplo un WAV) no pasa', () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])
    expect(detectImageFormat(wav)).toBeNull()
  })
})

describe('validateProductImage', () => {
  it('acepta una imagen válida del tamaño máximo exacto', () => {
    const result = validateProductImage(withJpegHeader(MAX_PRODUCT_IMAGE_BYTES))
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.format.extension).toBe('jpg')
  })

  it('rechaza una imagen que pasa el tamaño máximo por un byte', () => {
    const result = validateProductImage(withJpegHeader(MAX_PRODUCT_IMAGE_BYTES + 1))
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('InvalidProductImage')
  })

  it('rechaza un archivo vacío', () => {
    expect(isErr(validateProductImage(new Uint8Array()))).toBe(true)
  })

  it('rechaza un archivo que no es imagen', () => {
    const result = validateProductImage(TEXT_RENAMED_AS_JPG)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.problems.join(' ')).toMatch(/JPEG, PNG ni WebP/)
  })
})

describe('productImagePath', () => {
  it('guarda el archivo en la carpeta del producto con la extensión detectada', () => {
    const format = detectImageFormat(PNG_BYTES)
    if (format === null) throw new Error('esperaba PNG')
    expect(productImagePath('producto-1', 'archivo-1', format)).toBe('producto-1/archivo-1.png')
  })
})
