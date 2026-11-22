import type { RegularizationRefusal } from '@/features/delinquency/domain/regularization'
import type { ReceiptProblem } from '@/features/delinquency/domain/receipt'

export const ACCOUNT_PATH = '/portal/cuenta'

export const REGULARIZATION_FIELDS = {
  caseId: 'caseId',
  declaredAmount: 'declaredAmount',
  reference: 'reference',
  receipt: 'receipt',
} as const

export const regularizationMessages = {
  sent: 'Recibimos tu comprobante. El estudio lo va a revisar y aquí vas a ver el resultado.',
  accessDenied: 'Inicia sesión con tu cuenta de clienta para enviar el comprobante.',
  invalidForm: 'Revisa el monto y adjunta el comprobante.',
  missingReceipt: 'Adjunta el comprobante: una foto o un PDF.',
  storageFailed: 'No pudimos enviar el comprobante. Intenta de nuevo en unos minutos.',
  loadFailed: 'No pudimos cargar tu estado de cuenta. Intenta de nuevo en unos minutos.',
} as const

export const receiptProblemMessages: Readonly<Record<ReceiptProblem, string>> = {
  'receipt-empty': 'El archivo está vacío.',
  'receipt-too-large': 'El comprobante pesa más de 1 MB. Envía una captura de pantalla del SINPE o el PDF del banco.',
  'receipt-type-not-allowed': 'El comprobante tiene que ser una foto (JPG, PNG o WebP) o un PDF.',
}

export const refusalMessages: Readonly<Record<RegularizationRefusal, string>> = {
  'case-not-regularizable': 'Esta deuda ya no se puede regularizar desde aquí. Recarga la página.',
  'case-already-paid': 'Esta cita ya no tiene saldo pendiente.',
  'declared-amount-invalid': 'El monto tiene que ser un número entero, de 1 colón hasta lo que debes de esa cita.',
  'reference-too-long': 'La referencia puede tener hasta 100 caracteres.',
  'receipt-not-found': 'No encontramos el comprobante que subiste. Intenta de nuevo.',
  'receipt-already-used': 'Ese comprobante ya se usó. Intenta de nuevo.',
}

export const regularizationFormMessages = {
  legend: 'Enviar comprobante de pago',
  amountLabel: 'Monto que pagaste (en colones)',
  referenceLabel: 'Referencia del pago (opcional)',
  receiptLabel: 'Comprobante: foto o PDF, hasta 1 MB',
  submit: 'Enviar comprobante',
  sending: 'Enviando…',
  replaceHint: 'Si te equivocaste de comprobante, puedes enviar otro: reemplaza al que está en revisión.',
} as const

export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
