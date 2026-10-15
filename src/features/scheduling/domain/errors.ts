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

// Resultado esperado de negocio (DOM-006): el espacio ya está ocupado. Lo produce el mapeo del
// error de exclusion_violation de la base (DOM-010), no una consulta previa.
export interface SpaceNotAvailable {
  readonly code: 'SCHEDULING_SPACE_NOT_AVAILABLE'
  readonly resourceId: string
  readonly message: string
}

export type SchedulingError =
  | TechniqueNotSelectable
  | TechniqueNotAvailable
  | InvalidAppointmentWindow
  | SpaceNotAvailable

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
