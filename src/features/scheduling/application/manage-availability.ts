// Casos de uso de US-AGE-01: definir y listar disponibilidad semanal. "define" valida el
// invariante de dominio (constructor) antes de persistir — el repositorio no vuelve a validar.
import { WeeklyAvailabilityBlock, type WeeklyAvailabilityBlockProps } from '../domain/availability'
import type { SchedulingRepository } from './ports'

export async function defineWeeklyAvailability(
  repository: SchedulingRepository,
  props: WeeklyAvailabilityBlockProps
): Promise<WeeklyAvailabilityBlock> {
  return repository.saveWeeklyAvailability(new WeeklyAvailabilityBlock(props))
}

export function listWeeklyAvailability(repository: SchedulingRepository, resourceId: string) {
  return repository.listWeeklyAvailability(resourceId)
}
