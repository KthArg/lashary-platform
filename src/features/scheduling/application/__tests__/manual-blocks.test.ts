import { describe, it, expect } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { addManualBlock, listUpcomingManualBlocks } from '../manual-blocks'
import { MAX_MANUAL_BLOCKS, type ManualBlockRepository } from '../availability-ports'
import type { ManualBlock } from '../../domain/manual-blocks'
import {
  isManualBlockInvalid,
  isManualBlockOverlap,
  manualBlockOverlap,
} from '../../domain/availability-errors'

const RESOURCE = 'r-1'

// Imita la base: el exclusion constraint rechaza bloqueos solapados del mismo recurso.
function createFakeManualBlockRepository(initial: ManualBlock[] = []) {
  const blocks = [...initial]
  const listCalls: Array<{ after: Date; limit: number }> = []
  const repo: ManualBlockRepository = {
    async listEndingAfter(resourceId, after, limit) {
      listCalls.push({ after, limit })
      return blocks
        .filter((stored) => stored.resourceId === resourceId && stored.endsAt > after)
        .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
        .slice(0, limit)
    },
    async insert(block) {
      const overlaps = blocks.some(
        (stored) => stored.resourceId === block.resourceId && stored.startsAt < block.endsAt && block.startsAt < stored.endsAt,
      )
      if (overlaps) return err(manualBlockOverlap())
      blocks.push(block)
      return ok(undefined)
    },
    async insertMany() {
      throw new Error('no usado en estas pruebas')
    },
    async remove() {
      throw new Error('no usado en estas pruebas')
    },
  }
  return { repo, blocks, listCalls }
}

const at = (iso: string) => fixedDate(iso)
const blockOf = (id: string, from: string, to: string): ManualBlock => ({
  id,
  resourceId: RESOURCE,
  startsAt: at(from),
  endsAt: at(to),
  reason: null,
})

const NOW = '2026-10-14T18:00:00Z'
const deps = (repo: ManualBlockRepository) => ({ repo, newId: () => 'new-1', clock: fixedClock(NOW) })

describe('addManualBlock — US-AGE-01, criterio 3', () => {
  it('bloquea un espacio específico', async () => {
    const { repo, blocks } = createFakeManualBlockRepository()
    const result = await addManualBlock(deps(repo))({
      resourceId: RESOURCE,
      startsAt: at('2026-10-20T15:00:00Z'),
      endsAt: at('2026-10-20T17:00:00Z'),
      reason: 'cita médica',
    })
    expect(isOk(result) && result.value).toEqual({
      ...blockOf('new-1', '2026-10-20T15:00:00Z', '2026-10-20T17:00:00Z'),
      reason: 'cita médica',
    })
    expect(blocks).toHaveLength(1)
  })

  it('rechaza un bloqueo inválido sin escribir', async () => {
    const { repo, blocks } = createFakeManualBlockRepository()
    const result = await addManualBlock(deps(repo))({
      resourceId: RESOURCE,
      startsAt: at('2026-10-20T17:00:00Z'),
      endsAt: at('2026-10-20T15:00:00Z'),
    })
    expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    expect(blocks).toHaveLength(0)
  })

  it('devuelve el solape que reporta la base', async () => {
    const { repo } = createFakeManualBlockRepository([
      blockOf('a', '2026-10-20T15:00:00Z', '2026-10-20T17:00:00Z'),
    ])
    const result = await addManualBlock(deps(repo))({
      resourceId: RESOURCE,
      startsAt: at('2026-10-20T16:00:00Z'),
      endsAt: at('2026-10-20T18:00:00Z'),
    })
    expect(isErr(result) && isManualBlockOverlap(result.error)).toBe(true)
  })
})

describe('listUpcomingManualBlocks', () => {
  it('lista los bloqueos que todavía no terminaron, con tope de PERF-002', async () => {
    const { repo, listCalls } = createFakeManualBlockRepository([
      blockOf('terminado', '2026-10-14T10:00:00Z', '2026-10-14T12:00:00Z'),
      blockOf('en-curso', '2026-10-14T17:00:00Z', '2026-10-14T19:00:00Z'),
      blockOf('futuro', '2026-10-20T15:00:00Z', '2026-10-20T17:00:00Z'),
    ])
    const blocks = await listUpcomingManualBlocks(deps(repo))(RESOURCE)
    expect(blocks.map((block) => block.id)).toEqual(['en-curso', 'futuro'])
    expect(listCalls).toEqual([{ after: at(NOW), limit: MAX_MANUAL_BLOCKS }])
  })
})
