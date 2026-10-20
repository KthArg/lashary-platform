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

export type SchedulingError =
  | SlotNotOffered
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
