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
      return blocks.filter((b) => b.resourceId === resourceId).slice(0, limit)
    },
    async insert(block) {
      insertCalls++
      if (blocks.some((b) => weeklyBlocksOverlap(b, block))) return err(weeklyBlockOverlap(null))
      blocks.push(block)
      return ok(undefined)
    },
    async remove(id) {
      const index = blocks.findIndex((b) => b.id === id)
      if (index === -1) return false
      blocks.splice(index, 1)
      return true
    },
  }
}
