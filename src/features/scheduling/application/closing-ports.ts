import type { Result } from '@/shared/result'
import type { CloseOutcome } from '../domain/appointment-closing.constants'
import type {
  AppointmentNotChargeable,
  AppointmentNotClosable,
  StorageFailed,
  TechniqueNotAvailable,
} from '../domain/errors'

export type CloseAppointmentInput = {
  appointmentId: string
  outcome: CloseOutcome
  deliveredTechniqueId?: string
}

export type ClosedAppointment = {
  appointmentId: string
  outcome: CloseOutcome
  chargeAmount: number
  depositCredit: number
  amountDue: number
  forfeitedDeposit: number
}

export type CloseAppointmentError =
  | AppointmentNotClosable
  | AppointmentNotChargeable
  | TechniqueNotAvailable
  | StorageFailed

export interface AppointmentClosingRepository {
  close(input: CloseAppointmentInput): Promise<Result<ClosedAppointment, CloseAppointmentError>>
}

export type UnclosedAppointment = {
  id: string
  startsAtMs: number
  endsAtMs: number
  clientId: string | null
  clientName: string | null
  techniqueName: string | null
}

export interface UnclosedAppointmentsRepository {
  listUnclosed(nowMs: number, limit: number): Promise<Result<UnclosedAppointment[], StorageFailed>>
}
