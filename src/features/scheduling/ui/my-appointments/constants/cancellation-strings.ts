export const cancellationMessages = {
  accessDenied: 'Iniciá sesión como clienta para gestionar tus citas.',
  invalidAppointment: 'Esa cita no es válida.',
  clientNotRegistered: 'Completá tu perfil de clienta para gestionar tus citas.',
  notCancellable: 'Esta cita ya no se puede cancelar.',
  failed: 'No pudimos procesar tu solicitud. Intentá de nuevo.',
  cancelled: 'Tu cita fue cancelada.',
  cancelledLosingDeposit: 'Tu cita fue cancelada y el anticipo se dio por perdido.',
  withinWindow: 'Podés cancelar sin perder tu anticipo.',
  hours: (count: number) => (count === 1 ? '1 hora' : `${count} horas`),
  outsideWindowLosesDeposit: (hours: string, deposit: string) =>
    `Faltan menos de ${hours} para tu cita: si cancelás, perdés el anticipo de ${deposit}.`,
  outsideWindowNothingToLose: (hours: string) =>
    `Faltan menos de ${hours} para tu cita, pero no perdés ningún anticipo.`,
} as const
