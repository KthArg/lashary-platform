import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { detectReceiptFormat, receiptPath, RECEIPT_MAX_BYTES, validateReceipt } from '../receipt'

const bytesOf = (...values: number[]) => new Uint8Array(values)
const textOf = (text: string) => new TextEncoder().encode(text)

const JPEG = bytesOf(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10)
const PNG = bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00)
const WEBP = textOf('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')
const PDF = textOf('%PDF-1.7\n%âãÏÓ')

function withHeader(header: Uint8Array, size: number): Uint8Array {
  const bytes = new Uint8Array(size)
  bytes.set(header)
  return bytes
}

describe('detectReceiptFormat', () => {
  it.each([
    ['JPEG', JPEG, 'jpg', 'image/jpeg'],
    ['PNG', PNG, 'png', 'image/png'],
    ['WebP', WEBP, 'webp', 'image/webp'],
    ['PDF', PDF, 'pdf', 'application/pdf'],
  ])('reconoce un %s por sus primeros bytes', (_name, bytes, extension, contentType) => {
    expect(detectReceiptFormat(bytes)).toEqual({ extension, contentType })
  })

  it('un RIFF que no es WebP no se acepta (por ejemplo, un WAV)', () => {
    expect(detectReceiptFormat(textOf('RIFF\u0000\u0000\u0000\u0000WAVEfmt '))).toBeNull()
  })
})

describe('validateReceipt', () => {
  it('acepta un comprobante válido y devuelve su formato', () => {
    const result = validateReceipt(PDF)
    expect(isOk(result) && result.value.contentType).toBe('application/pdf')
  })

  it('rechaza un archivo vacío', () => {
    const result = validateReceipt(new Uint8Array(0))
    expect(isErr(result) && result.error).toBe('receipt-empty')
  })

  it('rechaza un HTML aunque se llame recibo.jpg: decide el contenido, no el nombre', () => {
    const result = validateReceipt(textOf('<html><script>alert(1)</script></html>'))
    expect(isErr(result) && result.error).toBe('receipt-type-not-allowed')
  })

  it('acepta exactamente 1 MB y rechaza un byte más', () => {
    expect(isOk(validateReceipt(withHeader(JPEG, RECEIPT_MAX_BYTES)))).toBe(true)
    const tooLarge = validateReceipt(withHeader(JPEG, RECEIPT_MAX_BYTES + 1))
    expect(isErr(tooLarge) && tooLarge.error).toBe('receipt-too-large')
  })
})

describe('receiptPath', () => {
  it('guarda el comprobante en la carpeta de la clienta con la extensión de su tipo real', () => {
    expect(receiptPath('clienta-1', 'archivo-1', { extension: 'pdf', contentType: 'application/pdf' })).toBe(
      'clienta-1/archivo-1.pdf',
    )
  })
})
