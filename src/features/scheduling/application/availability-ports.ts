import type { Result } from '@/shared/result'
import type { StorageFailed } from '../domain/errors'
import type { WeeklyBlock } from '../domain/weekly-availability'
import type { ClosedDate } from '../domain/closed-dates'
import type { ManualBlock } from '../domain/manual-blocks'
import type { BusyRange, OpenHours } from '../domain/day-slots'
import type {
  ClosedDateAlreadyExists,
  ClosedDateHasAppointment,
  ManualBlockHasAppointment,
  ManualBlockNotBlocked,
  ManualBlockOverlap,
  WeeklyBlockHasAppointment,
  WeeklyBlockOverlap,
} from '../domain/availability-errors'

// Recurso por defecto mientras exista uno solo (ADR-0005). Lo siembra la migración de US-AGE-09,
// 20261014000000_scheduling_model_and_no_overlap.sql; la UI no muestra selector de recurso.
export const DEFAULT_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'

// Tope de la lista de bloques de un recurso (PERF-002). Una semana real tiene unos pocos
// bloques por día; el tope solo impide una lectura sin límite.
export const MAX_WEEKLY_BLOCKS = 100

export interface WeeklyAvailabilityRepository {
  listByResource(resourceId: string, limit: number): Promise<WeeklyBlock[]>
  insert(block: WeeklyBlock): Promise<Result<void, WeeklyBlockOverlap>>
  remove(id: string): Promise<Result<boolean, WeeklyBlockHasAppointment>>
}

// Tope de días cerrados próximos que lista el panel (PERF-002).
export const MAX_CLOSED_DATES = 100

export interface ClosedDateRepository {
  // Días cerrados desde fromDate (AAAA-MM-DD, inclusive), por fecha ascendente.
  listFrom(resourceId: string, fromDate: string, limit: number): Promise<ClosedDate[]>
  insert(closedDate: ClosedDate): Promise<Result<void, ClosedDateAlreadyExists | ClosedDateHasAppointment>>
  remove(id: string): Promise<boolean>
}

// Tope de bloqueos próximos que lista el panel (PERF-002).
export const MAX_MANUAL_BLOCKS = 100

export interface DayAvailabilityRepository {
  listOpenHours(resourceId: string, date: string): Promise<OpenHours[]>
  listBusyRanges(resourceId: string, date: string): Promise<BusyRange[]>
}

export type MsRange = { fromMs: number; toMs: number }

export interface ManualBlockRepository {
  listInRange(resourceId: string, fromMs: number, untilMs: number): Promise<ManualBlock[]>
  releaseRanges(
    resourceId: string,
    ranges: readonly MsRange[],
  ): Promise<Result<void, ManualBlockNotBlocked | ManualBlockHasAppointment>>
  // Bloqueos que terminan después de `after`, por inicio ascendente.
  listEndingAfter(resourceId: string, after: Date, limit: number): Promise<ManualBlock[]>
  insert(block: ManualBlock): Promise<Result<void, ManualBlockOverlap | ManualBlockHasAppointment>>
  insertMany(blocks: readonly ManualBlock[]): Promise<Result<void, ManualBlockOverlap | ManualBlockHasAppointment>>
  remove(id: string): Promise<boolean>
}

export type AppointmentsInRange = {
  resourceId: string
  fromMs: number
  toMs: number
}

export interface AffectedAppointmentsRepository {
  countInRange(input: AppointmentsInRange): Promise<Result<number, StorageFailed>>
  countByWeeklyBlock(blockId: string): Promise<Result<number, StorageFailed>>
}
