import type { ReceiptProblem } from '@/features/store/domain/receipt'

export const CHECKOUT_PATH = '/portal/carrito/finalizar'

export const CHECKOUT_FIELDS = {
  contactPhone: 'contactPhone',
  receipt: 'receipt',
} as const

export const checkoutMessages = {
  title: 'Finalizar compra',
  subtitle: 'Pagás por SINPE Móvil y subís el comprobante. La administradora revisa el pago y aprueba el pedido.',
  totalPrefix: 'Total a pagar:',
  legend: 'Datos del pedido',
  contactPhoneLabel: 'Teléfono de contacto',
  deliveryNotice: 'Retiro en el estudio. Por ahora no hay envío a domicilio.',
  receiptLabel: 'Comprobante del pago: foto o PDF, hasta 1 MB',
  submit: 'Finalizar compra',
  sending: 'Enviando…',
  sent: 'Recibimos tu pedido. La administradora va a revisar el comprobante y te va a avisar cuando lo apruebe.',
  accessDenied: 'Inicia sesión con tu cuenta de clienta para finalizar la compra.',
  invalidForm: 'Revisa el teléfono de contacto.',
  missingReceipt: 'Adjunta el comprobante: una foto o un PDF.',
  storageFailed: 'No pudimos enviar tu pedido. Intenta de nuevo en unos minutos.',
  loading: 'Cargando tu carrito…',
  errorTitle: 'No pudimos cargar el checkout',
  errorBody: 'Revisa tu conexión e inténtalo de nuevo.',
  retry: 'Reintentar',
} as const

export const receiptProblemMessages: Readonly<Record<ReceiptProblem, string>> = {
  'receipt-empty': 'El archivo está vacío.',
  'receipt-too-large': 'El comprobante pesa más de 1 MB. Envía una captura de pantalla del SINPE o el PDF del banco.',
  'receipt-type-not-allowed': 'El comprobante tiene que ser una foto (JPG, PNG o WebP) o un PDF.',
}

export const checkoutRefusalMessages = {
  'not-a-client': 'Inicia sesión con tu cuenta de clienta para finalizar la compra.',
  'cart-empty': 'Tu carrito está vacío.',
  'insufficient-stock': 'Alguno de los productos de tu carrito ya no tiene suficientes existencias. Revisa las cantidades.',
  'receipt-not-found': 'No encontramos el comprobante que subiste. Intenta de nuevo.',
  'receipt-already-used': 'Ese comprobante ya se usó. Intenta de nuevo.',
} as const

export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
