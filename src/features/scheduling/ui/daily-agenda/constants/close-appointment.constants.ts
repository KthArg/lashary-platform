import type { CloseAppointmentError } from '@/features/scheduling/application/closing-ports'

export const CLOSE_AFTERCARE_NOTE_MAX_LENGTH = 1000

export const closeAppointmentMessages = {
  invalidRequest: 'No se pudo cerrar la cita: los datos enviados no son válidos.',
  notClosable: 'La cita ya no se puede cerrar: otra persona la cerró, todavía no terminó o ya no existe.',
  notChargeable: 'Esta cita no tiene clienta ni precio registrado, así que no se puede completar. Márcala como ausencia.',
  techniqueNotAvailable: 'El servicio prestado ya no está disponible en el catálogo.',
  noteNotAllowed: 'Una ausencia no lleva indicaciones de cuidado: quita la nota o cierra la cita como atendida.',
  failed: 'No se pudo cerrar la cita. Inténtalo de nuevo.',
} as const

export const CLOSE_ERROR_MESSAGES_BY_CODE: Record<CloseAppointmentError['code'], string> = {
  SCHEDULING_APPOINTMENT_NOT_CLOSABLE: closeAppointmentMessages.notClosable,
  SCHEDULING_APPOINTMENT_NOT_CHARGEABLE: closeAppointmentMessages.notChargeable,
  SCHEDULING_TECHNIQUE_NOT_AVAILABLE: closeAppointmentMessages.techniqueNotAvailable,
  SCHEDULING_CLOSE_NOTE_NOT_ALLOWED: closeAppointmentMessages.noteNotAllowed,
  SCHEDULING_STORAGE_FAILED: closeAppointmentMessages.failed,
}
