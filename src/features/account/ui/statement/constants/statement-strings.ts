export const statementMessages = {
  title: 'Estado de cuenta',
  subtitle: 'Lo que debes al estudio por citas ya atendidas, y el estado de cada pago que enviaste.',
  totalLabel: 'Total pendiente',
  empty: 'No tienes saldos pendientes con el estudio.',
  loading: 'Cargando tu estado de cuenta…',
  // Texto de relleno hasta que el estudio entregue los datos de su cuenta (decisión del PO, 2026-11-13).
  paymentInstructions:
    'Para pagar, haz una transferencia o un SINPE Móvil al estudio y sube aquí el comprobante. Si no tienes los datos de la cuenta, pídelos al estudio.',
  verificationNote: 'El estudio revisa cada comprobante antes de darlo por pagado.',
  pendingSince: (date: string) => `Pendiente desde el ${date}`,
  owed: (amount: string) => `Debes ${amount}`,
  settled: 'Saldada',
  inReview: (amount: string) => `Comprobante en revisión por ${amount}`,
  approved: (amount: string) => `Pago aprobado por ${amount}`,
  rejected: (reason: string) => `Comprobante rechazado: ${reason}`,
} as const

