import type { Result } from '@/shared/result'
import type { SelectableTechnique } from '../domain/technique-selection'
import type { TechniqueNotAvailable } from '../domain/errors'

export interface CatalogPort {
  findSelectableTechnique(
    id: string,
  ): Promise<Result<SelectableTechnique, TechniqueNotAvailable>>
}

export interface ClientHistoryPort {
  hasCompletedAppointment(clientId: string, techniqueId: string): Promise<boolean>
}
