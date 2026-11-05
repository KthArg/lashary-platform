export const CONFIRMED_APPOINTMENT_STATUS = 'confirmed'

export const confirmationMessages = {
  confirmButton: 'Confirmar asistencia',
  confirmButtonLabel: (slot: string) => `Confirmar tu asistencia a la cita del ${slot}`,
  confirming: 'Confirmando…',
  accessDenied: 'Iniciá sesión como clienta para gestionar tus citas.',
  invalidAppointment: 'Esa cita no es válida.',
  notConfirmable: 'Esta cita ya no se puede confirmar.',
  failed: 'No pudimos confirmar tu cita. Intentá de nuevo.',
  confirmed: 'Tu asistencia quedó confirmada.',
  confirmedWithPolicy: (hours: string) =>
    `Tu asistencia quedó confirmada. Si cancelás con menos de ${hours} de anticipación, perdés el anticipo.`,
  confirmedNote: 'Tu asistencia está confirmada. Si cancelás fuera de la ventana de cancelación, perdés el anticipo.',
} as const
