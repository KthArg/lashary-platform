// Casos de uso de US-AGE-01: definir y listar disponibilidad. "define" valida el invariante
// de dominio (createX) antes de persistir — el repositorio no vuelve a validar.
import { err, ok, isErr, type Result } from '@/shared/result'
import {
  createClosedDate,
  createManualBlock,
  createWeeklyAvailabilityBlock,
  type ClosedDate,
  type ClosedDateProps,
  type ManualBlock,
  type ManualBlockProps,
  type WeeklyAvailabilityBlock,
  type WeeklyAvailabilityBlockProps,
} from '../domain/availability'
import { isClosedDateAlreadyExistsError, type ClosedDateAlreadyExistsError } from '../domain/errors'
import type {
  InvalidBlockRangeError,
  InvalidDateError,
  InvalidDayOfWeekError,
  InvalidTimeRangeError,
} from '../domain/errors'
import type { SchedulingRepository } from './ports'

// DOM-006: repo.saveClosedDate() lanza ClosedDateAlreadyExistsError ante el UNIQUE
// (resource_id, closed_date) — el único error de infra que en realidad es un caso de negocio.
// Se atrapa acá, en el borde de application/, y se convierte a Result; cualquier otro throw es
// una falla de infra real y se deja propagar.
async function saveClosedDateOrConflict(
  repository: SchedulingRepository,
  closedDate: ClosedDate
): Promise<Result<ClosedDate, ClosedDateAlreadyExistsError>> {
  try {
    return ok(await repository.saveClosedDate(closedDate))
  } catch (error) {
    if (isClosedDateAlreadyExistsError(error)) return err(error)
    throw error
  }
}

export async function defineWeeklyAvailability(
  repository: SchedulingRepository,
  props: WeeklyAvailabilityBlockProps
): Promise<Result<WeeklyAvailabilityBlock, InvalidDayOfWeekError | InvalidTimeRangeError>> {
  const built = createWeeklyAvailabilityBlock(props)
  if (isErr(built)) return built
  return ok(await repository.saveWeeklyAvailability(built.value))
}

export function listWeeklyAvailability(
  repository: SchedulingRepository,
  resourceId: string
): Promise<WeeklyAvailabilityBlock[]> {
  return repository.listWeeklyAvailability(resourceId)
}

export async function defineClosedDate(
  repository: SchedulingRepository,
  props: ClosedDateProps
): Promise<Result<ClosedDate, InvalidDateError | ClosedDateAlreadyExistsError>> {
  const built = createClosedDate(props)
  if (isErr(built)) return built
  return saveClosedDateOrConflict(repository, built.value)
}

export function listClosedDates(
  repository: SchedulingRepository,
  resourceId: string
): Promise<ClosedDate[]> {
  return repository.listClosedDates(resourceId)
}

export async function defineManualBlock(
  repository: SchedulingRepository,
  props: ManualBlockProps
): Promise<Result<ManualBlock, InvalidBlockRangeError>> {
  const built = createManualBlock(props)
  if (isErr(built)) return built
  return ok(await repository.saveManualBlock(built.value))
}

export function listManualBlocks(
  repository: SchedulingRepository,
  resourceId: string
): Promise<ManualBlock[]> {
  return repository.listManualBlocks(resourceId)
}
