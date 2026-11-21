import type { ReviewRefusal } from '@/features/delinquency/domain/regularization'

export const queueMessages = {
  title: 'Comprobantes por revisar',
  // Pedido del PO (Kenny, 2026-11-13): verificar el comprobante y no confiar en el monto de la clienta.
  hint: 'Pagos que las clientas reportaron con su comprobante. Verifique el comprobante antes de aprobar: no confíe en el monto que declara la clienta.',
  empty: 'No hay comprobantes por revisar.',
  more: (shown: number) => `Hay más comprobantes por revisar. Se muestran los ${shown} más antiguos.`,
  declaredLabel: 'Declara',
  pendingTodayLabel: 'Debe hoy',
  submittedLabel: 'Enviado',
  referenceLabel: 'Referencia',
  openReceipt: 'Ver comprobante',
  openReceiptLabel: (clientName: string) => `Ver el comprobante de ${clientName} (se abre en otra pestaña)`,
  receiptUnavailable: 'No se pudo abrir el comprobante. Recargue la página.',
  loadError: 'No se pudieron cargar los comprobantes por revisar.',
  retry: 'Reintentar',
} as const

// La cola muestra hasta 50, como las otras listas de la pantalla (PERF-002).
export const QUEUE_LIMIT = 50

export const REVIEW_FIELDS = { requestId: 'requestId', approvedAmount: 'approvedAmount', reason: 'reason' } as const

export const decisionMessages = {
  approveLegend: 'Aprobar el pago',
  amountLabel: 'Monto verificado en el comprobante (en colones)',
  amountHint: (declared: string, owed: string) => `La clienta declara ${declared}; la cita debe hoy ${owed}.`,
  approve: 'Aprobar pago',
  approving: 'Aprobando…',
  rejectLegend: 'Rechazar el comprobante',
  reasonLabel: 'Motivo del rechazo (al menos 10 caracteres; la clienta lo verá)',
  reject: 'Rechazar',
  rejecting: 'Rechazando…',
  approvedSettled: 'Pago aprobado. La morosidad quedó saldada y la clienta ya puede agendar.',
  approvedPartial: 'Pago aprobado. La morosidad sigue activa por el saldo que queda.',
  rejected: 'Comprobante rechazado. La clienta verá el motivo en su estado de cuenta.',
  invalidInput: 'Revise el monto o el motivo.',
  saveFailed: 'No se pudo guardar. Intente de nuevo.',
} as const

export const reviewRefusalMessages: Readonly<Record<ReviewRefusal, string>> = {
  'request-not-found': 'La solicitud ya no existe. Recargue la página.',
  'request-not-pending': 'Esta solicitud ya se revisó o la clienta envió otra. Recargue la página.',
  'approved-amount-invalid': 'El monto tiene que ser un número entero, de 1 colón hasta lo que debe hoy la cita.',
  'rejection-reason-required': 'Escriba el motivo del rechazo, de 10 a 500 caracteres.',
}
