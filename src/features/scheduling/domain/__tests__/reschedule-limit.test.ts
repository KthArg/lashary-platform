import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { checkRescheduleLimit } from '../reschedule-limit'
import { MAX_RESCHEDULE_LIMIT, MIN_RESCHEDULE_LIMIT } from '../reschedule-limit.constants'

describe('checkRescheduleLimit', () => {
  it.each([MIN_RESCHEDULE_LIMIT, 1, MAX_RESCHEDULE_LIMIT])('acepta un tope de %s', (max) => {
    const result = checkRescheduleLimit(max)

    expect(isOk(result) && result.value).toBe(max)
  })

  it.each([MIN_RESCHEDULE_LIMIT - 1, MAX_RESCHEDULE_LIMIT + 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza un tope de %s sin lanzar',
    (max) => {
      const result = checkRescheduleLimit(max)

      expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_RESCHEDULE_LIMIT')
    },
  )
})
