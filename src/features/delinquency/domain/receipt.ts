import { ok, err, type Result } from '@/shared/result'

// Comprobante de pago: imagen o PDF de hasta 4 MB, dentro del rango de 3 a 5 MB de Kenny (2026-11-13): el archivo
// pasa por el servidor y Vercel acepta como mucho 4,5 MB por petición. Se revisa al conocer el peso promedio.
// El tipo se decide por los primeros bytes del archivo, nunca por la extensión ni por lo que declara el navegador
// (DOM-008). El bucket repite el tope y los tipos como segunda barrera.
export const RECEIPT_MAX_BYTES = 4 * 1024 * 1024

export type ReceiptFormat = {
  readonly extension: 'jpg' | 'png' | 'webp' | 'pdf'
  readonly contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf'
}

export type ReceiptProblem = 'receipt-empty' | 'receipt-too-large' | 'receipt-type-not-allowed'

const JPEG: ReceiptFormat = { extension: 'jpg', contentType: 'image/jpeg' }
const PNG: ReceiptFormat = { extension: 'png', contentType: 'image/png' }
const WEBP: ReceiptFormat = { extension: 'webp', contentType: 'image/webp' }
const PDF: ReceiptFormat = { extension: 'pdf', contentType: 'application/pdf' }

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46]
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50]
const WEBP_SIGNATURE_OFFSET = 8
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  signature.every((byte, index) => bytes[offset + index] === byte)

export function detectReceiptFormat(bytes: Uint8Array): ReceiptFormat | null {
  if (startsWith(bytes, JPEG_SIGNATURE)) return JPEG
  if (startsWith(bytes, PNG_SIGNATURE)) return PNG
  if (startsWith(bytes, RIFF_SIGNATURE) && startsWith(bytes, WEBP_SIGNATURE, WEBP_SIGNATURE_OFFSET)) return WEBP
  if (startsWith(bytes, PDF_SIGNATURE)) return PDF
  return null
}

export function validateReceipt(bytes: Uint8Array): Result<ReceiptFormat, ReceiptProblem> {
  if (bytes.byteLength === 0) return err('receipt-empty')
  if (bytes.byteLength > RECEIPT_MAX_BYTES) return err('receipt-too-large')
  const format = detectReceiptFormat(bytes)
  return format ? ok(format) : err('receipt-type-not-allowed')
}

// La carpeta es la de la clienta: el bucket solo la deja escribir ahí y la base comprueba que el comprobante esté ahí.
export const receiptPath = (clientId: string, fileId: string, format: ReceiptFormat): string =>
  `${clientId}/${fileId}.${format.extension}`
