export type TechniqueNotSelectableReason = 'inactive' | 'no_retouch'

export interface TechniqueNotSelectable {
  readonly code: 'SCHEDULING_TECHNIQUE_NOT_SELECTABLE'
  readonly techniqueId: string
  readonly reason: TechniqueNotSelectableReason
  readonly message: string
}

export interface TechniqueNotAvailable {
  readonly code: 'SCHEDULING_TECHNIQUE_NOT_AVAILABLE'
  readonly techniqueId: string
  readonly message: string
}

export type AppointmentWindowField =
  | 'startsAtMs'
  | 'serviceDurationMin'
  | 'prepMin'
  | 'cleanupMin'

export interface InvalidAppointmentWindow {
  readonly code: 'SCHEDULING_INVALID_APPOINTMENT_WINDOW'
  readonly field: AppointmentWindowField
  readonly message: string
}

export interface SpaceNotAvailable {
  readonly code: 'SCHEDULING_SPACE_NOT_AVAILABLE'
  readonly resourceId: string
  readonly message: string
}

export interface AppointmentNotPending {
  readonly code: 'SCHEDULING_APPOINTMENT_NOT_PENDING'
  readonly appointmentId: string
  readonly message: string
}

export interface InvalidDecisionReason {
  readonly code: 'SCHEDULING_INVALID_DECISION_REASON'
  readonly message: string
}

export interface StorageFailed {
  readonly code: 'SCHEDULING_STORAGE_FAILED'
  readonly message: string
}

export interface AuditNotRecorded {
  readonly code: 'SCHEDULING_AUDIT_NOT_RECORDED'
  readonly message: string
}

export interface SlotNotOffered {
  readonly code: 'SCHEDULING_SLOT_NOT_OFFERED'
  readonly resourceId: string
  readonly message: string
}

export interface ClientNotRegistered {
  readonly code: 'SCHEDULING_CLIENT_NOT_REGISTERED'
  readonly message: string
}

export interface ClientHasActiveDelinquency {
  readonly code: 'SCHEDULING_CLIENT_HAS_ACTIVE_DELINQUENCY'
  readonly message: string
}

export interface TooManyPendingAppointments {
  readonly code: 'SCHEDULING_TOO_MANY_PENDING_APPOINTMENTS'
  readonly message: string
}

export interface CancellationConsequenceChanged {
  readonly code: 'SCHEDULING_CANCELLATION_CONSEQUENCE_CHANGED'
  readonly appointmentId: string
  readonly message: string
}

export interface InvalidCancellationWindow {
  readonly code: 'SCHEDULING_INVALID_CANCELLATION_WINDOW'
  readonly hours: number
  readonly message: string
}

export interface AppointmentScheduleChanged {
  readonly code: 'SCHEDULING_APPOINTMENT_SCHEDULE_CHANGED'
  readonly appointmentId: string
  readonly startsAtMs: number
  readonly endsAtMs: number
  readonly message: string
}

export interface InvalidRescheduleLimit {
  readonly code: 'SCHEDULING_INVALID_RESCHEDULE_LIMIT'
  readonly max: number
  readonly message: string
}

export interface AppointmentNotCancellable {
  readonly code: 'SCHEDULING_APPOINTMENT_NOT_CANCELLABLE'
  readonly appointmentId: string
  readonly message: string
}

export interface AppointmentNotReschedulable {
  readonly code: 'SCHEDULING_APPOINTMENT_NOT_RESCHEDULABLE'
  readonly appointmentId: string
  readonly message: string
}

export interface RescheduleOutsideWindow {
  readonly code: 'SCHEDULING_RESCHEDULE_OUTSIDE_WINDOW'
  readonly appointmentId: string
  readonly message: string
}

export interface RescheduleLimitReached {
  readonly code: 'SCHEDULING_RESCHEDULE_LIMIT_REACHED'
  readonly appointmentId: string
  readonly message: string
}

export interface RescheduleStateChanged {
  readonly code: 'SCHEDULING_RESCHEDULE_STATE_CHANGED'
  readonly appointmentId: string
  readonly message: string
}

export interface RescheduleSlotNotOffered {
  readonly code: 'SCHEDULING_RESCHEDULE_SLOT_NOT_OFFERED'
  readonly appointmentId: string
  readonly message: string
}

export interface RescheduleSlotTaken {
  readonly code: 'SCHEDULING_RESCHEDULE_SLOT_TAKEN'
  readonly appointmentId: string
  readonly message: string
}

export interface AppointmentNotClosable {
  readonly code: 'SCHEDULING_APPOINTMENT_NOT_CLOSABLE'
  readonly appointmentId: string
  readonly message: string
}

export interface InvalidClosingAmount {
  readonly code: 'SCHEDULING_INVALID_CLOSING_AMOUNT'
  readonly appointmentId: string
  readonly message: string
}

export interface AppointmentNotChargeable {
  readonly code: 'SCHEDULING_APPOINTMENT_NOT_CHARGEABLE'
  readonly appointmentId: string
  readonly message: string
}

export type SchedulingError =
  | SlotNotOffered
  | TooManyPendingAppointments
  | ClientNotRegistered
  | ClientHasActiveDelinquency
  | TechniqueNotSelectable
  | TechniqueNotAvailable
  | InvalidAppointmentWindow
  | SpaceNotAvailable
  | AppointmentNotPending
  | InvalidDecisionReason
  | StorageFailed
  | AuditNotRecorded
  | AppointmentNotCancellable
  | CancellationConsequenceChanged
  | InvalidCancellationWindow
  | InvalidRescheduleLimit
  | AppointmentScheduleChanged
  | AppointmentNotReschedulable
  | RescheduleOutsideWindow
  | RescheduleLimitReached
  | RescheduleStateChanged
  | RescheduleSlotNotOffered
  | RescheduleSlotTaken
  | AppointmentNotClosable
  | InvalidClosingAmount
  | AppointmentNotChargeable

export const techniqueNotSelectable = (
  techniqueId: string,
  reason: TechniqueNotSelectableReason,
): TechniqueNotSelectable => ({
  code: 'SCHEDULING_TECHNIQUE_NOT_SELECTABLE',
  techniqueId,
  reason,
  message:
    reason === 'inactive'
      ? `la técnica ${techniqueId} no está activa para nuevas reservas`
      : `la técnica ${techniqueId} no ofrece retoque para re-aplicación`,
})

export const techniqueNotAvailable = (techniqueId: string): TechniqueNotAvailable => ({
  code: 'SCHEDULING_TECHNIQUE_NOT_AVAILABLE',
  techniqueId,
  message: `no existe la técnica ${techniqueId} en el catálogo`,
})

export const invalidAppointmentWindow = (
  field: AppointmentWindowField,
): InvalidAppointmentWindow => ({
  code: 'SCHEDULING_INVALID_APPOINTMENT_WINDOW',
  field,
  message: `el valor de ${field} no es válido para calcular el espacio de la cita`,
})

export const spaceNotAvailable = (resourceId: string): SpaceNotAvailable => ({
  code: 'SCHEDULING_SPACE_NOT_AVAILABLE',
  resourceId,
  message: `el espacio ${resourceId} ya está ocupado en ese horario`,
})

export const isSpaceNotAvailable = (value: unknown): value is SpaceNotAvailable =>
  typeof value === 'object' &&
  value !== null &&
  (value as { code?: unknown }).code === 'SCHEDULING_SPACE_NOT_AVAILABLE'

export const slotNotOffered = (resourceId: string): SlotNotOffered => ({
  code: 'SCHEDULING_SLOT_NOT_OFFERED',
  resourceId,
  message: 'ese horario no está entre los que ofrece el calendario',
})

export const clientNotRegistered = (): ClientNotRegistered => ({
  code: 'SCHEDULING_CLIENT_NOT_REGISTERED',
  message: 'la sesión no es de una clienta registrada',
})

export const tooManyPendingAppointments = (): TooManyPendingAppointments => ({
  code: 'SCHEDULING_TOO_MANY_PENDING_APPOINTMENTS',
  message: 'la clienta ya tiene el máximo de citas pendientes de aprobación',
})

export const clientHasActiveDelinquency = (): ClientHasActiveDelinquency => ({
  code: 'SCHEDULING_CLIENT_HAS_ACTIVE_DELINQUENCY',
  message: 'la clienta tiene una morosidad activa y no puede reservar',
})

export const appointmentNotPending = (appointmentId: string): AppointmentNotPending => ({
  code: 'SCHEDULING_APPOINTMENT_NOT_PENDING',
  appointmentId,
  message: `la cita ${appointmentId} no existe o ya no está pendiente de aprobación`,
})

export const invalidDecisionReason = (): InvalidDecisionReason => ({
  code: 'SCHEDULING_INVALID_DECISION_REASON',
  message: 'el motivo de la decisión es demasiado largo',
})

export const storageFailed = (detail: string): StorageFailed => ({
  code: 'SCHEDULING_STORAGE_FAILED',
  message: `no se pudo acceder al almacenamiento de citas: ${detail}`,
})

export const auditNotRecorded = (): AuditNotRecorded => ({
  code: 'SCHEDULING_AUDIT_NOT_RECORDED',
  message: 'la decisión quedó guardada pero no se pudo registrar en la bitácora',
})

export const appointmentNotCancellable = (appointmentId: string): AppointmentNotCancellable => ({
  code: 'SCHEDULING_APPOINTMENT_NOT_CANCELLABLE',
  appointmentId,
  message: `la cita ${appointmentId} no existe, ya pasó o no está en un estado que se pueda cancelar`,
})

export const cancellationConsequenceChanged = (appointmentId: string): CancellationConsequenceChanged => ({
  code: 'SCHEDULING_CANCELLATION_CONSEQUENCE_CHANGED',
  appointmentId,
  message: `la consecuencia de cancelar la cita ${appointmentId} cambió desde que la clienta la vio`,
})

export const invalidCancellationWindow = (hours: number): InvalidCancellationWindow => ({
  code: 'SCHEDULING_INVALID_CANCELLATION_WINDOW',
  hours,
  message: `la ventana de cancelación debe ser un número entero de horas, no negativo y de hasta 30 días: ${hours}`,
})

export const appointmentNotReschedulable = (appointmentId: string): AppointmentNotReschedulable => ({
  code: 'SCHEDULING_APPOINTMENT_NOT_RESCHEDULABLE',
  appointmentId,
  message: `la cita ${appointmentId} no existe, ya pasó o no está en un estado que se pueda reagendar`,
})

export const rescheduleOutsideWindow = (appointmentId: string): RescheduleOutsideWindow => ({
  code: 'SCHEDULING_RESCHEDULE_OUTSIDE_WINDOW',
  appointmentId,
  message: `la cita ${appointmentId} está dentro de la ventana de cancelación y ya no se puede reagendar, solo cancelar`,
})

export const rescheduleLimitReached = (appointmentId: string): RescheduleLimitReached => ({
  code: 'SCHEDULING_RESCHEDULE_LIMIT_REACHED',
  appointmentId,
  message: `la cita ${appointmentId} ya se reagendó el máximo de veces permitido`,
})

export const rescheduleStateChanged = (appointmentId: string): RescheduleStateChanged => ({
  code: 'SCHEDULING_RESCHEDULE_STATE_CHANGED',
  appointmentId,
  message: `la cita ${appointmentId} cambió de estado desde que la clienta la vio`,
})

export const rescheduleSlotNotOffered = (appointmentId: string): RescheduleSlotNotOffered => ({
  code: 'SCHEDULING_RESCHEDULE_SLOT_NOT_OFFERED',
  appointmentId,
  message: `ese horario no está entre los que ofrece el calendario`,
})

export const rescheduleSlotTaken = (appointmentId: string): RescheduleSlotTaken => ({
  code: 'SCHEDULING_RESCHEDULE_SLOT_TAKEN',
  appointmentId,
  message: `el horario nuevo de la cita ${appointmentId} ya está ocupado`,
})

export const invalidRescheduleLimit = (max: number): InvalidRescheduleLimit => ({
  code: 'SCHEDULING_INVALID_RESCHEDULE_LIMIT',
  max,
  message: `el tope de reagendados debe ser un número entero entre 0 y 3: ${max}`,
})

export const appointmentScheduleChanged = (
  appointmentId: string,
  startsAtMs: number,
  endsAtMs: number,
): AppointmentScheduleChanged => ({
  code: 'SCHEDULING_APPOINTMENT_SCHEDULE_CHANGED',
  appointmentId,
  startsAtMs,
  endsAtMs,
  message: `el horario de la cita ${appointmentId} cambió desde que la administradora lo vio`,
})

export const appointmentNotClosable = (appointmentId: string): AppointmentNotClosable => ({
  code: 'SCHEDULING_APPOINTMENT_NOT_CLOSABLE',
  appointmentId,
  message: `la cita ${appointmentId} no existe, todavía no terminó o no está en un estado que se pueda cerrar`,
})

export const invalidClosingAmount = (appointmentId: string): InvalidClosingAmount => ({
  code: 'SCHEDULING_INVALID_CLOSING_AMOUNT',
  appointmentId,
  message: `el precio o el anticipo de la cita ${appointmentId} no son montos enteros válidos para cerrarla`,
})

export const appointmentNotChargeable = (appointmentId: string): AppointmentNotChargeable => ({
  code: 'SCHEDULING_APPOINTMENT_NOT_CHARGEABLE',
  appointmentId,
  message: `la cita ${appointmentId} no tiene clienta o precio registrado, así que no se puede generar su cargo`,
})
