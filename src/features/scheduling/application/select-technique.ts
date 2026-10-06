import type { Result } from '@/shared/result'
import { selectTechnique as applyDurationPolicy } from '../domain/technique-selection'
import type { TechniqueSelection } from '../domain/technique-selection'
import type { TechniqueNotAvailable, TechniqueNotSelectable } from '../domain/errors'
import type { CatalogPort, ClientHistoryPort } from './ports'

export type SelectTechniqueInput = {
  clientId: string
  techniqueId: string
  isFirstTimeOverride?: boolean
}

export const selectTechnique =
  (catalog: CatalogPort, history: ClientHistoryPort) =>
  async (
    input: SelectTechniqueInput,
  ): Promise<Result<TechniqueSelection, TechniqueNotAvailable | TechniqueNotSelectable>> => {
    const found = await catalog.findSelectableTechnique(input.techniqueId)
    if (!found.ok) return found

    const isFirstTime =
      input.isFirstTimeOverride ??
      !(await history.hasCompletedAppointment(input.clientId, input.techniqueId))

    return applyDurationPolicy(found.value, isFirstTime)
  }
