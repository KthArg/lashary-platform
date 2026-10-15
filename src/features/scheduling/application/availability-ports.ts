import type { Result } from '@/shared/result'
import type { WeeklyBlock } from '../domain/weekly-availability'
import type { ClosedDate } from '../domain/closed-dates'
import type { ClosedDateAlreadyExists, WeeklyBlockOverlap } from '../domain/availability-errors'

// Recurso por defecto mientras exista uno solo (ADR-0005). Lo siembra la migración de US-AGE-09,
// 20261014000000_scheduling_model_and_no_overlap.sql; la UI no muestra selector de recurso.
export const DEFAULT_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'

// Tope de la lista de bloques de un recurso (PERF-002). Una semana real tiene unos pocos
// bloques por día; el tope solo impide una lectura sin límite.
export const MAX_WEEKLY_BLOCKS = 100

export interface WeeklyAvailabilityRepository {
  listByResource(resourceId: string, limit: number): Promise<WeeklyBlock[]>
  insert(block: WeeklyBlock): Promise<Result<void, WeeklyBlockOverlap>>
  remove(id: string): Promise<boolean>
}

// Tope de días cerrados próximos que lista el panel (PERF-002).
export const MAX_CLOSED_DATES = 100

export interface ClosedDateRepository {
  // Días cerrados desde fromDate (AAAA-MM-DD, inclusive), por fecha ascendente.
  listFrom(resourceId: string, fromDate: string, limit: number): Promise<ClosedDate[]>
  insert(closedDate: ClosedDate): Promise<Result<void, ClosedDateAlreadyExists>>
  remove(id: string): Promise<boolean>
}
