import type { Result } from '@/shared/result'
import type { SelectableTechnique } from '../domain/technique-selection'
import type { AppointmentDecision } from '../domain/appointment-decision.constants'
import type {
  AppointmentNotPending,
  ClientNotRegistered,
  SlotNotOffered,
  SpaceNotAvailable,
  StorageFailed,
  TechniqueNotAvailable,
} from '../domain/errors'

export interface CatalogPort {
  findSelectableTechnique(
    id: string,
  ): Promise<Result<SelectableTechnique, TechniqueNotAvailable>>
}

export interface ClientHistoryPort {
  hasCompletedAppointment(clientId: string, techniqueId: string): Promise<boolean>
}

export type NewAppointment = {
  resourceId: string
  startsAtMs: number
  endsAtMs: number
  occupiedFromMs: number
  occupiedUntilMs: number
}

export type CreatedAppointment = {
  id: string
  resourceId: string
}

export interface AppointmentRepository {
  create(appointment: NewAppointment): Promise<Result<CreatedAppointment, SpaceNotAvailable | StorageFailed>>
}

export type BookAppointmentInput = {
  resourceId: string
  startsAtMs: number
  techniqueId: string
  isFirstTime: boolean
}

export type BookedAppointment = {
  id: string
  resourceId: string
  startsAtMs: number
  endsAtMs: number
  techniqueName: string
  servicePrice: number
  depositRequired: number
  depositRegistered: number
  isFirstTime: boolean
}

export type BookAppointmentError =
  | ClientNotRegistered
  | TechniqueNotAvailable
  | SlotNotOffered
  | SpaceNotAvailable
  | StorageFailed

export interface BookingRepository {
  book(input: BookAppointmentInput): Promise<Result<BookedAppointment, BookAppointmentError>>
}

export interface DelinquencyPort {
  hasActiveDelinquency(): Promise<boolean>
}

export type DecideAppointmentInput = {
  appointmentId: string
  decision: AppointmentDecision
  reason: string | null
}

export type DecidedAppointment = {
  id: string
  status: AppointmentDecision
}

export interface AppointmentDecisionRepository {
  decide(
    input: DecideAppointmentInput,
  ): Promise<Result<DecidedAppointment, AppointmentNotPending | StorageFailed>>
}

export type RecordAuditEvent = (input: {
  actorId: string
  action: string
  entityType: string
  entityId: string
  payload?: Record<string, unknown>
}) => Promise<Result<unknown, unknown>>

export type PendingAppointment = {
  id: string
  startsAtMs: number
  endsAtMs: number
}

export interface PendingAppointmentsRepository {
  listPending(): Promise<Result<PendingAppointment[], StorageFailed>>
}
