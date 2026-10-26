import { describe, it, expect } from 'vitest'
import { err, isErr, isOk } from '@/shared/result'
import { addWeeklyBlock, listWeeklyBlocks, removeWeeklyBlock } from '../weekly-availability'
import { MAX_WEEKLY_BLOCKS } from '../availability-ports'
import {
  isAvailabilityEntryNotFound,
  isWeeklyBlockHasAppointment,
  isWeeklyBlockInvalid,
  isWeeklyBlockOverlap,
  weeklyBlockHasAppointment,
} from '../../domain/availability-errors'
import type { WeeklyBlock } from '../../domain/weekly-availability'
import { createFakeWeeklyAvailabilityRepository } from './availability-fakes'

const RESOURCE = 'r-1'
const monday = (id: string, startMin: number, endMin: number): WeeklyBlock => ({
  id,
  resourceId: RESOURCE,
  weekday: 1,
  startMin,
  endMin,
})

function setup(initial: WeeklyBlock[] = []) {
  const repo = createFakeWeeklyAvailabilityRepository(initial)
  let next = 0
  const deps = { repo, newId: () => `new-${++next}` }
  return { repo, deps }
}

describe('addWeeklyBlock — US-AGE-01, criterio 1', () => {
  it('guarda un bloque válido y lo devuelve con su id', async () => {
    const { repo, deps } = setup()
    const result = await addWeeklyBlock(deps)({ resourceId: RESOURCE, weekday: 1, startMin: 540, endMin: 720 })
    expect(isOk(result) && result.value).toEqual(monday('new-1', 540, 720))
    expect(repo.blocks).toHaveLength(1)
  })

  it('permite varios bloques el mismo día si no se solapan', async () => {
    const { repo, deps } = setup([monday('a', 540, 720)])
    const result = await addWeeklyBlock(deps)({ resourceId: RESOURCE, weekday: 1, startMin: 780, endMin: 1020 })
    expect(isOk(result)).toBe(true)
    expect(repo.blocks).toHaveLength(2)
  })

  it('rechaza un bloque inválido sin tocar el repositorio', async () => {
    const { repo, deps } = setup()
    const result = await addWeeklyBlock(deps)({ resourceId: RESOURCE, weekday: 1, startMin: 720, endMin: 540 })
    expect(isErr(result) && isWeeklyBlockInvalid(result.error)).toBe(true)
    expect(repo.insertCalls).toBe(0)
  })

  it('rechaza un solape nombrando el bloque en conflicto', async () => {
    const { repo, deps } = setup([monday('a', 540, 720)])
    const result = await addWeeklyBlock(deps)({ resourceId: RESOURCE, weekday: 1, startMin: 600, endMin: 800 })
    expect(isErr(result) && isWeeklyBlockOverlap(result.error) && result.error.conflictingId).toBe('a')
    expect(repo.insertCalls).toBe(0)
  })

  it('propaga el rechazo de la base cuando el solape aparece entre la lectura y la escritura', async () => {
    const { repo, deps } = setup()
    const racing = { ...repo, listByResource: async () => [], insert: repo.insert }
    await repo.insert(monday('a', 540, 720))
    const result = await addWeeklyBlock({ ...deps, repo: racing })({
      resourceId: RESOURCE,
      weekday: 1,
      startMin: 600,
      endMin: 660,
    })
    expect(isErr(result) && isWeeklyBlockOverlap(result.error) && result.error.conflictingId).toBeNull()
  })
})

describe('listWeeklyBlocks', () => {
  it('devuelve los bloques ordenados por día y hora, con tope de PERF-002', async () => {
    const { repo, deps } = setup([
      { ...monday('c', 60, 120), weekday: 3 },
      monday('b', 800, 900),
      monday('a', 60, 120),
    ])
    let askedLimit = 0
    const spy = {
      ...repo,
      listByResource: async (resourceId: string, limit: number) => {
        askedLimit = limit
        return repo.listByResource(resourceId, limit)
      },
    }
    const blocks = await listWeeklyBlocks({ ...deps, repo: spy })(RESOURCE)
    expect(blocks.map((block) => block.id)).toEqual(['a', 'b', 'c'])
    expect(askedLimit).toBe(MAX_WEEKLY_BLOCKS)
  })
})

describe('removeWeeklyBlock', () => {
  it('elimina un bloque existente', async () => {
    const { repo, deps } = setup([monday('a', 540, 720)])
    expect(isOk(await removeWeeklyBlock(deps)('a'))).toBe(true)
    expect(repo.blocks).toHaveLength(0)
  })

  it('si la base lo rechaza por citas activas, lo devuelve tipado y no borra nada', async () => {
    const { repo, deps } = setup([monday('a', 540, 720)])
    const rejecting = { ...deps, repo: { ...repo, remove: async () => err(weeklyBlockHasAppointment()) } }
    const result = await removeWeeklyBlock(rejecting)('a')
    expect(isErr(result) && isWeeklyBlockHasAppointment(result.error)).toBe(true)
    expect(repo.blocks).toHaveLength(1)
  })

  it('reporta no encontrado si el bloque no existe', async () => {
    const { deps } = setup()
    const result = await removeWeeklyBlock(deps)('nope')
    expect(isErr(result) && isAvailabilityEntryNotFound(result.error)).toBe(true)
  })
})
