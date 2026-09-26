// Caso de uso de solo lectura para el recurso agendable (ADR-0005). Separado de
// manage-availability.ts porque "recurso" no es "disponibilidad" — son conceptos distintos
// que hoy comparten historia, no por eso comparten módulo.
import type { Resource } from '../domain/resource'
import type { SchedulingRepository } from './ports'

export function listResources(repository: SchedulingRepository): Promise<Resource[]> {
  return repository.listResources()
}
