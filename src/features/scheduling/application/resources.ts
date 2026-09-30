import type { Resource } from '../domain/resource'
import type { SchedulingRepository } from './ports'

export function listResources(repository: SchedulingRepository): Promise<Resource[]> {
  return repository.listResources()
}
