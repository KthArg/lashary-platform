import { describe, expect, it } from 'vitest'
import { WeeklyAvailabilityBlock } from '../domain/availability'
import { defineWeeklyAvailability } from '../application/manage-availability'
import type { SchedulingRepository } from '../application/ports'

function fakeRepository(): SchedulingRepository {
  const weekly: WeeklyAvailabilityBlock[] = []
  return {
    async listWeeklyAvailability(resourceId) {
      return weekly.filter((b) => b.resourceId === resourceId)
    },
    async saveWeeklyAvailability(block) {
      weekly.push(block)
      return block
    },
  }
}

describe('defineWeeklyAvailability', () => {
  it('persiste un bloque válido a través del repositorio', async () => {
    const repo = fakeRepository()
    await defineWeeklyAvailability(repo, { resourceId: 'r1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' })
    await expect(repo.listWeeklyAvailability('r1')).resolves.toHaveLength(1)
  })

  it('no persiste un bloque inválido — el repositorio nunca se llama', async () => {
    const repo = fakeRepository()
    await expect(
      defineWeeklyAvailability(repo, { resourceId: 'r1', dayOfWeek: 1, startTime: '17:00', endTime: '09:00' })
    ).rejects.toThrow()
    await expect(repo.listWeeklyAvailability('r1')).resolves.toHaveLength(0)
  })
})
