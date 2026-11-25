export const myOrdersMessages = {
  pending: (totalLabel: string) => `Tu pedido de ${totalLabel} está pendiente de aprobación.`,
  approved: (totalLabel: string) => `Tu pedido de ${totalLabel} fue aprobado.`,
  rejected: (totalLabel: string, reason: string) => `Tu pedido de ${totalLabel} fue rechazado. Motivo: ${reason}`,
} as const
