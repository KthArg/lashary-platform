import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { isAvailabilityEntryNotFound, isManualBlockInvalid } from '../../domain/availability-errors'
import type { ManualBlock } from '../../domain/manual-blocks'
import type { ManualBlockRepository } from '../availability-ports'
import { releaseManualBlockTail } from '../release-manual-block'

const threeHours: ManualBlock = {
  id: 'b-1',
  resourceId: 'r-1',
  startsAt: fixedDate('2026-10-19T14:00:00Z'),
  endsAt: fixedDate('2026-10-19T17:00:00Z'),
  reason: 'trámite',
}

function createFakeRepository(initial: ManualBlock[]) {
  const blocks = [...initial]
  const shortenCalls: Array<[string, number]> = []
  const repo: Pick<ManualBlockRepository, 'findById' | 'shorten'> = {
    async findById(id) {
      return blocks.find((stored) => stored.id === id) ?? null
    },
    async shorten(id, newEndsAtMs) {
      shortenCalls.push([id, newEndsAtMs])
      return blocks.some((stored) => stored.id === id)
    },
  }
  return { repo, shortenCalls }
}

describe('releaseManualBlockTail — US-AGE-07, criterio 3', () => {
  it('libera los últimos espacios: solo cambia el fin', async () => {
    const { repo, shortenCalls } = createFakeRepository([threeHours])
    const result = await releaseManualBlockTail({ repo })({ id: 'b-1', steps: 2, expectedEndsAt: threeHours.endsAt })

    expect(isOk(result)).toBe(true)
    expect(shortenCalls).toEqual([['b-1', Date.parse('2026-10-19T16:00:00.000Z')]])
    expect(isOk(result) && result.value).toEqual({ id: 'b-1', endsAtMs: Date.parse('2026-10-19T16:00:00.000Z') })
  })

  it('un bloqueo que ya no existe devuelve no encontrado sin escribir', async () => {
    const { repo, shortenCalls } = createFakeRepository([])
    const result = await releaseManualBlockTail({ repo })({ id: 'b-1', steps: 1, expectedEndsAt: threeHours.endsAt })

    expect(isErr(result) && isAvailabilityEntryNotFound(result.error)).toBe(true)
    expect(shortenCalls).toEqual([])
  })

  it('si el bloqueo cambió desde que se abrió el panel no aplica nada', async () => {
    const { repo, shortenCalls } = createFakeRepository([{ ...threeHours, endsAt: fixedDate('2026-10-19T16:00:00Z') }])
    const result = await releaseManualBlockTail({ repo })({ id: 'b-1', steps: 1, expectedEndsAt: threeHours.endsAt })

    expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    expect(shortenCalls).toEqual([])
  })

  it('una cantidad inválida de espacios o un fin esperado inválido no llegan a la base', async () => {
    const { repo, shortenCalls } = createFakeRepository([threeHours])
    const invalidInputs = [
      { steps: 0, expectedEndsAt: threeHours.endsAt },
      { steps: 6, expectedEndsAt: threeHours.endsAt },
      { steps: 1, expectedEndsAt: fixedDate('no es una fecha') },
    ]
    for (const input of invalidInputs) {
      const result = await releaseManualBlockTail({ repo })({ id: 'b-1', ...input })
      expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    }
    expect(shortenCalls).toEqual([])
  })

  it('si la base dice que el bloqueo desapareció entre la lectura y la escritura, devuelve no encontrado', async () => {
    const { repo } = createFakeRepository([threeHours])
    const vanishing = { ...repo, shorten: async () => false }
    const result = await releaseManualBlockTail({ repo: vanishing })({
      id: 'b-1',
      steps: 1,
      expectedEndsAt: threeHours.endsAt,
    })
    expect(isErr(result) && isAvailabilityEntryNotFound(result.error)).toBe(true)
  })
})
