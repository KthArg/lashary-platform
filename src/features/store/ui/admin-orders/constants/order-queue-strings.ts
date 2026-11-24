export const ORDERS_ADMIN_PATH = '/admin/catalog/orders'

export const QUEUE_LIMIT = 50

export const ORDER_REVIEW_FIELDS = { orderId: 'orderId', reason: 'reason' } as const

export const orderQueueMessages = {
  title: 'Pedidos por revisar',
  hint: 'Pedidos que las clientas enviaron con su comprobante. Verifique el comprobante antes de aprobar: no confíe en el monto declarado.',
  empty: 'No hay pedidos por revisar.',
  clientFallback: 'Clienta',
  totalLabel: 'Total',
  contactLabel: 'Contacto',
  deliveryLabel: 'Entrega',
  submittedLabel: 'Enviado',
  linesLabel: 'Productos',
  openReceipt: 'Ver comprobante',
  openReceiptLabel: (clientName: string) => `Ver el comprobante de ${clientName} (se abre en otra pestaña)`,
  receiptUnavailable: 'No se pudo abrir el comprobante. Recargue la página.',
  loadError: 'No se pudieron cargar los pedidos por revisar.',
  retry: 'Reintentar',
} as const

export const orderDecisionMessages = {
  approve: 'Aprobar pedido',
  approving: 'Aprobando…',
  rejectLegend: 'Rechazar el pedido',
  reasonLabel: 'Motivo del rechazo (al menos 10 caracteres; la clienta lo verá)',
  reject: 'Rechazar',
  rejecting: 'Rechazando…',
  approved: 'Pedido aprobado.',
  rejected: 'Pedido rechazado. Las existencias se devolvieron y la clienta verá el motivo.',
  invalidInput: 'Revise el pedido o el motivo.',
  saveFailed: 'No se pudo guardar. Intente de nuevo.',
} as const

export const orderReviewRefusalMessages = {
  'order-not-found': 'El pedido ya no existe. Recargue la página.',
  'order-not-pending': 'Este pedido ya se revisó. Recargue la página.',
  'rejection-reason-required': 'Escriba el motivo del rechazo, de 10 a 500 caracteres.',
} as const
