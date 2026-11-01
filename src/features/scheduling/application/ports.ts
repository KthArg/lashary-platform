import type { Result } from '@/shared/result'
import type { SelectableTechnique } from '../domain/technique-selection'
import type { AppointmentDecision } from '../domain/appointment-decision.constants'
import type { CancellableStatus } from '../domain/appointment-cancellation.constants'
import type { RescheduleBlock } from '../domain/appointment-reschedule.constants'
import type { SchedulingAlert } from '../domain/alert'
import type { AgendaAppointment } from '../domain/daily-agenda'
import type {
  AppointmentNotCancellable,
  AppointmentNotPending,
  AppointmentScheduleChanged,
  AppointmentNotReschedulable,
  CancellationConsequenceChanged,
  ClientNotRegistered,
  InvalidCancellationWindow,
  InvalidRescheduleLimit,
  PackageNotAvailable,
  RescheduleLimitReached,
  RescheduleOutsideWindow,
  RescheduleSlotNotOffered,
  RescheduleSlotTaken,
  RescheduleStateChanged,
  TooManyPendingAppointments,
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

export type AppointmentReminderSnapshot = {
  appointmentId: string
  clientId: string
  startsAt: Date
  techniqueName: string
}

export type ReminderSnapshotsWindow = { from: Date; to: Date }

export interface ReminderSnapshotsRepository {
  listActiveStartingWithin(
    window: ReminderSnapshotsWindow,
  ): Promise<Result<AppointmentReminderSnapshot[], StorageFailed>>
  getActiveById(appointmentId: string): Promise<Result<AppointmentReminderSnapshot | null, StorageFailed>>
}

export interface RescheduleExpiryRepository {
  expireUndecided(): Promise<Result<number, StorageFailed>>
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
  | TooManyPendingAppointments
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

export type BookPackageAppointmentInput = {
  resourceId: string
  startsAtMs: number
  packageId: string
}

export type BookedPackageAppointment = {
  id: string
  resourceId: string
  startsAtMs: number
  endsAtMs: number
  packageName: string
  servicePrice: number
  depositRequired: number
  depositRegistered: number
}

export type BookPackageAppointmentError =
  | ClientNotRegistered
  | TooManyPendingAppointments
  | PackageNotAvailable
  | SlotNotOffered
  | SpaceNotAvailable
  | StorageFailed

export interface PackageBookingRepository {
  book(
    input: BookPackageAppointmentInput,
  ): Promise<Result<BookedPackageAppointment, BookPackageAppointmentError>>
}

export type QuotePackageBookingInput = {
  packageId: string
}

export type PackageBookingQuote = {
  packageName: string
  servicePrice: number
  durationMin: number
  bufferMin: number
  depositDue: number
}

export type QuotePackageBookingError = ClientNotRegistered | PackageNotAvailable | StorageFailed

export interface PackageBookingQuoteRepository {
  quote(input: QuotePackageBookingInput): Promise<Result<PackageBookingQuote, QuotePackageBookingError>>
}

export type CancellationQuote = {
  startsAtMs: number
  techniqueName: string
  withinWindow: boolean
  windowHours: number
  forfeitedDeposit: number
}

export type CancelledAppointment = {
  appointmentId: string
  withinWindow: boolean
  forfeitedDeposit: number
}

export type CancellationError =
  | ClientNotRegistered
  | AppointmentNotCancellable
  | CancellationConsequenceChanged
  | StorageFailed

export interface CancellationRepository {
  quote(appointmentId: string): Promise<Result<CancellationQuote, CancellationError>>
  cancel(
    appointmentId: string,
    expectedForfeitedDeposit: number,
  ): Promise<Result<CancelledAppointment, CancellationError>>
}

export type RescheduleInput = {
  appointmentId: string
  newStartsAtMs: number
  expectedStatus: CancellableStatus
}

export type RescheduledAppointment = {
  appointmentId: string
  startsAtMs: number
  endsAtMs: number
  rescheduleCount: number
}

export type RescheduleError =
  | ClientNotRegistered
  | AppointmentNotReschedulable
  | RescheduleOutsideWindow
  | RescheduleLimitReached
  | RescheduleStateChanged
  | RescheduleSlotNotOffered
  | RescheduleSlotTaken
  | TooManyPendingAppointments
  | StorageFailed

export type RescheduleQuote = {
  startsAtMs: number
  endsAtMs: number
  occupiedMinutes: number
  techniqueName: string
  status: CancellableStatus
  rescheduleCount: number
  maxReschedules: number
  windowHours: number
  blockedBy: RescheduleBlock | null
}

export type RescheduleQuoteError = ClientNotRegistered | AppointmentNotReschedulable | StorageFailed

export interface RescheduleRepository {
  quote(appointmentId: string): Promise<Result<RescheduleQuote, RescheduleQuoteError>>
  reschedule(input: RescheduleInput): Promise<Result<RescheduledAppointment, RescheduleError>>
}

export type CancellationWindowChange = { previousHours: number; newHours: number }

export interface CancellationPolicyRepository {
  getWindowHours(): Promise<Result<number, StorageFailed>>
  changeWindowHours(hours: number): Promise<Result<CancellationWindowChange, StorageFailed | InvalidCancellationWindow>>
}

export type RescheduleLimitChange = { previousMax: number; newMax: number }

export interface ReschedulePolicyRepository {
  getMaxReschedules(): Promise<Result<number, StorageFailed>>
  changeMaxReschedules(max: number): Promise<Result<RescheduleLimitChange, StorageFailed | InvalidRescheduleLimit>>
}

export type MyAppointment = {
  id: string
  startsAtMs: number
  endsAtMs: number
  techniqueName: string
  status: CancellableStatus
  isFirstTime: boolean | null
  servicePrice: number
  depositRequired: number
  heldSchedule: HeldSchedule | null
}

export interface MyAppointmentsRepository {
  listUpcoming(nowMs: number): Promise<Result<MyAppointment[], StorageFailed>>
}

export interface DelinquencyPort {
  hasActiveDelinquency(): Promise<boolean>
}

export interface DelinquentClientsPort {
  listWithActiveDelinquency(clientIds: readonly string[]): Promise<Result<ReadonlySet<string>, StorageFailed>>
}

export type DecideAppointmentInput = {
  appointmentId: string
  decision: AppointmentDecision
  reason: string | null
  expectedStartsAtMs?: number
}

export type DecidedAppointment = {
  id: string
  status: AppointmentDecision
}

export interface AppointmentDecisionRepository {
  decide(
    input: DecideAppointmentInput,
  ): Promise<Result<DecidedAppointment, AppointmentNotPending | AppointmentScheduleChanged | StorageFailed>>
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
  isFirstTime: boolean | null
  detectedFirstTime: boolean | null
  servicePrice: number
  depositRequired: number
}

export type HeldSchedule = {
  startsAtMs: number
  endsAtMs: number
}

export type PendingAppointment = {
  id: string
  startsAtMs: number
  endsAtMs: number
  clientName: string | null
  choice: AppointmentChoice | null
  heldSchedule: HeldSchedule | null
}

export interface PendingAppointmentsRepository {
  listPending(): Promise<Result<PendingAppointment[], StorageFailed>>
}

export interface AlertsRepository {
  listRecent(limit: number): Promise<Result<SchedulingAlert[], StorageFailed>>
}

export interface DailyAgendaRepository {
  listBetween(fromMs: number, untilMs: number): Promise<Result<AgendaAppointment[], StorageFailed>>
}
