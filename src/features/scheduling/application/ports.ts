import type { Result } from '@/shared/result'
import type { SelectableTechnique } from '../domain/technique-selection'
import type { AppointmentDecision } from '../domain/appointment-decision.constants'
import type { SchedulingAlert } from '../domain/alert'
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
  hasCompletedAppointment(techniqueId: string): Promise<Result<boolean, StorageFailed>>
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

export type QuoteBookingInput = {
  techniqueId: string
  isFirstTime: boolean
}

export type BookingQuote = {
  techniqueName: string
  servicePrice: number
  durationMin: number
  bufferMin: number
  depositDue: number
}

export type QuoteBookingError = ClientNotRegistered | TechniqueNotAvailable | StorageFailed

export interface BookingQuoteRepository {
  quote(input: QuoteBookingInput): Promise<Result<BookingQuote, QuoteBookingError>>
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

export type AppointmentChoice = {
  techniqueName: string
  isFirstTime: boolean
  servicePrice: number
  depositRequired: number
}

export type PendingAppointment = {
  id: string
  startsAtMs: number
  endsAtMs: number
  choice: AppointmentChoice | null
}

export interface PendingAppointmentsRepository {
  listPending(): Promise<Result<PendingAppointment[], StorageFailed>>
}

export interface AlertsRepository {
  listRecent(limit: number): Promise<Result<SchedulingAlert[], StorageFailed>>
}
