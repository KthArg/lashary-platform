import { ok, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { createManualBlock, type ManualBlock } from '../domain/manual-blocks'
import type { ManualBlockInvalid, ManualBlockOverlap } from '../domain/availability-errors'
import { MAX_MANUAL_BLOCKS, type ManualBlockRepository } from './availability-ports'

export type ManualBlocksDeps = {
  repo: ManualBlockRepository
  newId: () => string
  clock: Clock
}

export type AddManualBlockInput = {
  resourceId: string
  startsAt: Date
  endsAt: Date
  reason?: string | null
}

// Los bloqueos que ya terminaron no le sirven al panel.
export const listUpcomingManualBlocks =
  (deps: Pick<ManualBlocksDeps, 'repo' | 'clock'>) =>
  async (resourceId: string): Promise<ManualBlock[]> =>
    deps.repo.listEndingAfter(resourceId, deps.clock(), MAX_MANUAL_BLOCKS)

// Criterio 3: bloquear manualmente un espacio específico. El no-solape entre bloqueos lo
// garantiza la base (exclusion constraint); el repositorio lo traduce a ManualBlockOverlap.
export const addManualBlock =
  (deps: Pick<ManualBlocksDeps, 'repo' | 'newId'>) =>
  async (
    input: AddManualBlockInput,
  ): Promise<Result<ManualBlock, ManualBlockInvalid | ManualBlockOverlap>> => {
    const built = createManualBlock({ id: deps.newId(), ...input })
    if (isErr(built)) return built

    const saved = await deps.repo.insert(built.value)
    if (isErr(saved)) return saved

    return ok(built.value)
  }
