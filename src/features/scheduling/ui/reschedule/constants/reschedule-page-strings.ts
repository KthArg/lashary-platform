import { MY_APPOINTMENTS_PATH } from '../../my-appointments/constants/my-appointments-strings'

export const RESCHEDULE_PATH_SEGMENT = 'reagendar'

export const RESCHEDULE_DATE_PARAM = 'fecha'

export const reschedulePageMessages = {
  title: 'Reagendar tu cita',
  subtitle: 'Elegí un nuevo espacio para tu cita. La administradora tiene que aprobarlo de nuevo.',
  currentLegend: 'Tu cita actual',
  current: (service: string, slot: string) => `${service} · ${slot}`,
  remaining: (count: number) =>
    count === 1 ? 'Podés reagendar esta cita 1 vez más.' : `Podés reagendar esta cita ${count} veces más.`,
  slotsLegend: 'Espacios del día',
  accessDenied: 'Iniciá sesión como clienta para reagendar tus citas.',
  notReschedulable: 'Esta cita ya no se puede reagendar.',
  failed: 'No pudimos cargar tu cita. Intentá de nuevo.',
  outsideWindow: (hours: string) =>
    `Faltan menos de ${hours} para tu cita y ya no se puede reagendar. Si no podés asistir, podés cancelarla.`,
  limitReached: (max: number) =>
    max === 0
      ? 'Por ahora no se pueden reagendar citas.'
      : `Esta cita ya se reagendó ${max === 1 ? '1 vez' : `${max} veces`}, el máximo permitido.`,
  backToAppointments: 'Volver a mis citas',
  error: {
    title: 'No se pudo cargar la pantalla de reagendar',
    body: 'Ocurrió un error al consultar tu cita y la disponibilidad.',
    retry: 'Reintentar',
  },
} as const

export const reschedulePath = (appointmentId: string, date?: string): string => {
  const path = `${MY_APPOINTMENTS_PATH}/${appointmentId}/${RESCHEDULE_PATH_SEGMENT}`
  return date ? `${path}?${RESCHEDULE_DATE_PARAM}=${date}` : path
}
