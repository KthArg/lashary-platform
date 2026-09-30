import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import type { ClosedDate, ManualBlock, WeeklyAvailabilityBlock } from '../domain/availability'
import {
  defineClosedDate,
  defineManualBlock,
  defineWeeklyAvailability,
  listClosedDates,
  listManualBlocks,
} from '../application/manage-availability'
import { listResources } from '../application/resources'
import type { SchedulingRepository } from '../application/ports'

function fakeRepository(): SchedulingRepository {
  const weekly: WeeklyAvailabilityBlock[] = []
  const closed: ClosedDate[] = []
  const manual: ManualBlock[] = []
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
    async listManualBlocks(resourceId) {
      return manual.filter((m) => m.resourceId === resourceId)
    },
    async saveManualBlock(block) {
      manual.push(block)
      return block
    },
  }
}

describe('defineWeeklyAvailability', () => {
  it('persiste un bloque válido a través del repositorio', async () => {
    const repo = fakeRepository()
    const result = await defineWeeklyAvailability(repo, { resourceId: 'r1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' })
    expect(isOk(result)).toBe(true)
    await expect(repo.listWeeklyAvailability('r1')).resolves.toHaveLength(1)
  })

  it('no persiste un bloque inválido — el repositorio nunca se llama', async () => {
    const repo = fakeRepository()
    const result = await defineWeeklyAvailability(repo, { resourceId: 'r1', dayOfWeek: 1, startTime: '17:00', endTime: '09:00' })
    expect(isErr(result)).toBe(true)
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
    const result = await defineClosedDate(repo, { resourceId: 'r1', closedDate: 'no-es-fecha' })
    expect(isErr(result)).toBe(true)
    await expect(listClosedDates(repo, 'r1')).resolves.toHaveLength(0)
  })
})

describe('defineManualBlock', () => {
  it('persiste un bloqueo manual válido', async () => {
    const repo = fakeRepository()
    const saved = await defineManualBlock(repo, {
      resourceId: 'r1',
      startsAt: new Date('2026-10-01T14:00:00Z'),
      endsAt: new Date('2026-10-01T15:00:00Z'),
    })
    expect(isOk(saved)).toBe(true)
    if (isOk(saved)) expect(saved.value.resourceId).toBe('r1')
  })

  it('no persiste un bloqueo con ends_at <= starts_at', async () => {
    const repo = fakeRepository()
    const result = await defineManualBlock(repo, {
      resourceId: 'r1',
      startsAt: new Date('2026-10-01T15:00:00Z'),
      endsAt: new Date('2026-10-01T14:00:00Z'),
    })
    expect(isErr(result)).toBe(true)
  })

  it('listManualBlocks devuelve solo los bloqueos del recurso pedido', async () => {
    const repo = fakeRepository()
    await defineManualBlock(repo, {
      resourceId: 'r1',
      startsAt: new Date('2026-10-01T14:00:00Z'),
      endsAt: new Date('2026-10-01T15:00:00Z'),
    })
    await defineManualBlock(repo, {
      resourceId: 'r2',
      startsAt: new Date('2026-10-02T14:00:00Z'),
      endsAt: new Date('2026-10-02T15:00:00Z'),
    })
    await expect(listManualBlocks(repo, 'r1')).resolves.toHaveLength(1)
    await expect(listManualBlocks(repo, 'r2')).resolves.toHaveLength(1)
  })
})

describe('listResources', () => {
  it('devuelve los recursos del repositorio (ADR-0005)', async () => {
    const repo = fakeRepository()
    await expect(listResources(repo)).resolves.toEqual([{ id: 'r1', name: 'Dueña' }])
  })
})
