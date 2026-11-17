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
