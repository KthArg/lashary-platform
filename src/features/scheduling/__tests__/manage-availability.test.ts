import { describe, expect, it } from 'vitest'
import { ClosedDate, WeeklyAvailabilityBlock } from '../domain/availability'
import { defineClosedDate, defineWeeklyAvailability, listClosedDates } from '../application/manage-availability'
import type { SchedulingRepository } from '../application/ports'

function fakeRepository(): SchedulingRepository {
  const weekly: WeeklyAvailabilityBlock[] = []
  const closed: ClosedDate[] = []
  return {
    async listResources() {
      return [{ id: 'r1', name: 'Dueña' }]
    },
    async listWeeklyAvailability(resourceId) {
      return weekly.filter((b) => b.resourceId === resourceId)
    },
    async saveWeeklyAvailability(block) {
      weekly.push(block)
      return block
    },
    async listClosedDates(resourceId) {
      return closed.filter((c) => c.resourceId === resourceId)
    },
    async saveClosedDate(closedDate) {
      closed.push(closedDate)
      return closedDate
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

describe('defineClosedDate', () => {
  it('persiste un feriado válido', async () => {
    const repo = fakeRepository()
    await defineClosedDate(repo, { resourceId: 'r1', closedDate: '2026-12-25', reason: 'Navidad' })
    const result = await listClosedDates(repo, 'r1')
    expect(result[0]?.reason).toBe('Navidad')
  })

  it('no persiste un feriado con fecha inválida', async () => {
    const repo = fakeRepository()
    await expect(defineClosedDate(repo, { resourceId: 'r1', closedDate: 'no-es-fecha' })).rejects.toThrow()
    await expect(listClosedDates(repo, 'r1')).resolves.toHaveLength(0)
  })
})
