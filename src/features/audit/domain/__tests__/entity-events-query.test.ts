import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { isAuditQueryInvalid } from '../errors'
import {
  ENTITY_EVENTS_LIMITS,
  normalizeEntityEventsQuery,
  type ListEntityEventsQuery,
} from '../entity-events-query'

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'
const { defaultLimit, maxLimit, maxEntityIds } = ENTITY_EVENTS_LIMITS

const normalize = (overrides: Partial<ListEntityEventsQuery>) =>
  normalizeEntityEventsQuery({ entityType: 'delinquency_case', entityIds: [CASE_ID], ...overrides })

describe('normalizeEntityEventsQuery', () => {
  it('recorta el tipo de recurso y usa el límite por defecto', () => {
    const result = normalize({ entityType: '  delinquency_case ' })

    expect(isOk(result) && result.value).toEqual({
      entityType: 'delinquency_case',
      entityIds: [CASE_ID],
      limit: defaultLimit,
    })
  })

  it('un tipo de recurso vacío tras recortar es inválido', () => {
    const result = normalize({ entityType: '   ' })

    expect(isErr(result) && isAuditQueryInvalid(result.error)).toBe(true)
  })

  it('acepta el máximo de recursos y rechaza uno más', () => {
    const buildIds = (count: number) => Array.from({ length: count }, (_, index) => `id-${index}`)
    const tooMany = normalize({ entityIds: buildIds(maxEntityIds + 1) })

    expect(isOk(normalize({ entityIds: buildIds(maxEntityIds) }))).toBe(true)
    expect(isErr(tooMany) && isAuditQueryInvalid(tooMany.error)).toBe(true)
  })

  it.each([
    [10, 10],
    [maxLimit + 1, maxLimit],
    [0, defaultLimit],
    [-5, defaultLimit],
    [2.5, defaultLimit],
    [Number.NaN, defaultLimit],
  ])('el límite %s queda en %s', (limit, expected) => {
    const result = normalize({ limit })

    expect(isOk(result) && result.value.limit).toBe(expected)
  })
})
