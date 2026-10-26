import { ok, err } from '@/shared/result'
import { weeklyBlocksOverlap, type WeeklyBlock } from '../../domain/weekly-availability'
import { weeklyBlockOverlap } from '../../domain/availability-errors'
import type { WeeklyAvailabilityRepository } from '../availability-ports'

export type FakeWeeklyAvailabilityRepository = WeeklyAvailabilityRepository & {
  readonly blocks: WeeklyBlock[]
  readonly insertCalls: number
}

// Imita la base: el exclusion constraint rechaza solapes aunque el use-case no los haya visto.
export function createFakeWeeklyAvailabilityRepository(
  initial: WeeklyBlock[] = [],
): FakeWeeklyAvailabilityRepository {
  const blocks = [...initial]
  let insertCalls = 0
  return {
    blocks,
    get insertCalls() {
      return insertCalls
    },
    async listByResource(resourceId, limit) {
      return blocks.filter((stored) => stored.resourceId === resourceId).slice(0, limit)
    },
    async insert(block) {
      insertCalls++
      if (blocks.some((stored) => weeklyBlocksOverlap(stored, block))) return err(weeklyBlockOverlap(null))
      blocks.push(block)
      return ok(undefined)
    },
    async remove(id) {
      const index = blocks.findIndex((stored) => stored.id === id)
      if (index === -1) return ok(false)
      blocks.splice(index, 1)
      return ok(true)
    },
  }
}
