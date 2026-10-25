export type AppointmentStatus =
  | 'pending_approval'
  | 'approved'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export type DepositStatus = 'none' | 'pending' | 'registered'

export interface DepositAmounts {
  readonly depositRequired: number
  readonly depositRegistered: number
}

export interface AppointmentHistoryRecord extends DepositAmounts {
  readonly id: string
  readonly startsAtMs: number
  readonly status: AppointmentStatus
  readonly serviceName: string
}

export interface AppointmentHistoryEntry {
  readonly id: string
  readonly startsAtMs: number
  readonly status: AppointmentStatus
  readonly serviceName: string
  readonly depositStatus: DepositStatus
}
