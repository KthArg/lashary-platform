export type AlertKind = 'appointment_overlap_rejected'

export interface SchedulingAlert {
  readonly id: string
  readonly kind: AlertKind
  readonly resourceId: string
  readonly requestedFromMs: number
  readonly requestedUntilMs: number
  readonly createdAtMs: number
}
