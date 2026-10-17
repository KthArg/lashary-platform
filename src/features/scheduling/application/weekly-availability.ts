import { ok, err, isErr, type Result } from '@/shared/result'
import {
  createWeeklyBlock,
  findOverlappingBlock,
  sortWeeklyBlocks,
  type WeeklyBlock,
} from '../domain/weekly-availability'
import {
  availabilityEntryNotFound,
  weeklyBlockOverlap,
  type AvailabilityEntryNotFound,
  type WeeklyBlockInvalid,
  type WeeklyBlockOverlap,
} from '../domain/availability-errors'
import { MAX_WEEKLY_BLOCKS, type WeeklyAvailabilityRepository } from './availability-ports'

export type WeeklyAvailabilityDeps = {
  repo: WeeklyAvailabilityRepository
  newId: () => string
}

export type AddWeeklyBlockInput = {
  resourceId: string
  weekday: number
  startMin: number
  endMin: number
}

export const listWeeklyBlocks =
  (deps: Pick<WeeklyAvailabilityDeps, 'repo'>) =>
  async (resourceId: string): Promise<WeeklyBlock[]> =>
    sortWeeklyBlocks(await deps.repo.listByResource(resourceId, MAX_WEEKLY_BLOCKS))

// Criterio 1: definir un bloque de disponibilidad para un día. El solape se revisa antes para
// dar un mensaje con el bloque en conflicto; la base lo garantiza igual (exclusion constraint).
export const addWeeklyBlock =
  (deps: WeeklyAvailabilityDeps) =>
  async (
    input: AddWeeklyBlockInput,
  ): Promise<Result<WeeklyBlock, WeeklyBlockInvalid | WeeklyBlockOverlap>> => {
    const built = createWeeklyBlock({ id: deps.newId(), ...input })
    if (isErr(built)) return built

    const existing = await deps.repo.listByResource(input.resourceId, MAX_WEEKLY_BLOCKS)
    const conflict = findOverlappingBlock(built.value, existing)
    if (conflict) return err(weeklyBlockOverlap(conflict.id))

    const saved = await deps.repo.insert(built.value)
    if (isErr(saved)) return saved

    return ok(built.value)
  }

export const removeWeeklyBlock =
  (deps: Pick<WeeklyAvailabilityDeps, 'repo'>) =>
  async (id: string): Promise<Result<void, AvailabilityEntryNotFound>> =>
    (await deps.repo.remove(id)) ? ok(undefined) : err(availabilityEntryNotFound(id))
