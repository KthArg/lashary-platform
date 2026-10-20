import { err, type Result } from '@/shared/result'
import { selectTechnique as applyDurationPolicy } from '../domain/technique-selection'
import type { TechniqueSelection } from '../domain/technique-selection'
import type {
  StorageFailed,
  TechniqueNotAvailable,
  TechniqueNotSelectable,
} from '../domain/errors'
import type { CatalogPort, ClientHistoryPort } from './ports'

export type SelectTechniqueInput = {
  techniqueId: string
  isFirstTimeOverride?: boolean
}

export const selectTechnique =
  (catalog: CatalogPort, history: ClientHistoryPort) =>
  async (
    input: SelectTechniqueInput,
  ): Promise<
    Result<TechniqueSelection, TechniqueNotAvailable | TechniqueNotSelectable | StorageFailed>
  > => {
    const found = await catalog.findSelectableTechnique(input.techniqueId)
    if (!found.ok) return found

    if (input.isFirstTimeOverride !== undefined) {
      return applyDurationPolicy(found.value, input.isFirstTimeOverride)
    }

    const completed = await history.hasCompletedAppointment(input.techniqueId)
    if (!completed.ok) return err(completed.error)

    return applyDurationPolicy(found.value, !completed.value)
  }
