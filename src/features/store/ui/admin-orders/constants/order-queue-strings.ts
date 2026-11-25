export const ORDERS_ADMIN_PATH = '/admin/catalog/orders'

export const QUEUE_LIMIT = 50

export const ORDER_HISTORY_PAGE_SIZE = 20

export const ORDER_REVIEW_FIELDS = { orderId: 'orderId', reason: 'reason' } as const

export const orderQueueMessages = {
  title: 'Pedidos por revisar',
  hint: 'Pedidos que las clientas enviaron con su comprobante. Verifique el comprobante antes de aprobar: no confíe en el monto declarado.',
  empty: 'No hay pedidos por revisar.',
  clientFallback: 'Clienta',
  totalLabel: 'Total',
  contactLabel: 'Contacto',
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

export const orderTabsMessages = {
  tabsLabel: 'Secciones de pedidos',
  pendingTab: 'Pendientes',
  historyTab: 'Historial',
} as const

export const orderStateLabels = {
  pending_approval: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
} as const

export const orderHistoryMessages = {
  title: 'Historial de pedidos',
  empty: 'Todavía no hay pedidos en el historial.',
  clientFallback: 'Clienta',
  totalLabel: 'Total',
  submittedLabel: 'Enviado',
  reviewedLabel: 'Revisado',
  linesLabel: 'Productos',
  rejectionReasonLabel: 'Motivo del rechazo',
  openReceipt: 'Ver comprobante',
  openReceiptLabel: (clientName: string) => `Ver el comprobante de ${clientName} (se abre en otra pestaña)`,
  receiptUnavailable: 'No se pudo abrir el comprobante. Recargue la página.',
  loadError: 'No se pudo cargar el historial de pedidos.',
  retry: 'Reintentar',
  paginationLabel: 'Paginación del historial de pedidos',
  pageStatus: (page: number, totalPages: number) => `Página ${page} de ${totalPages}`,
  previous: 'Anterior',
  next: 'Siguiente',
} as const
