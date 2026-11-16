import type { Result } from '@/shared/result'
import type { ClosableStatus, CloseOutcome } from '../domain/appointment-closing.constants'
import type {
  AppointmentNotChargeable,
  CloseNoteNotAllowed,
  AppointmentNotClosable,
  StorageFailed,
  TechniqueNotAvailable,
} from '../domain/errors'

export type CloseAppointmentInput = {
  appointmentId: string
  outcome: CloseOutcome
  deliveredTechniqueId?: string
  aftercareNote?: string | null
}

export type ClosedAppointment = {
  appointmentId: string
  outcome: CloseOutcome
  chargeAmount: number
  depositCredit: number
  amountDue: number
  forfeitedDeposit: number
  aftercareRecorded: boolean
}

export type CloseAppointmentError =
  | AppointmentNotClosable
  | AppointmentNotChargeable
  | TechniqueNotAvailable
  | CloseNoteNotAllowed
  | StorageFailed

export interface AppointmentClosingRepository {
  close(input: CloseAppointmentInput): Promise<Result<ClosedAppointment, CloseAppointmentError>>
}

export type UnclosedAppointment = {
  id: string
  status: ClosableStatus
  startsAtMs: number
  endsAtMs: number
  clientId: string | null
  clientName: string | null
  techniqueId: string | null
  isFirstTime: boolean | null
  techniqueName: string | null
  isPackage: boolean
  servicePrice: number | null
  depositRegistered: number
}

export interface UnclosedAppointmentsRepository {
  listUnclosed(nowMs: number, limit: number): Promise<Result<UnclosedAppointment[], StorageFailed>>
}
