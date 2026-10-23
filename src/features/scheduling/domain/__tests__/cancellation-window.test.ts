import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { checkCancellationWindowHours } from '../cancellation-window'
import { MAX_CANCELLATION_WINDOW_HOURS } from '../cancellation-window.constants'

describe('checkCancellationWindowHours', () => {
  it.each([0, 1, 48, MAX_CANCELLATION_WINDOW_HOURS])('acepta %s horas', (hours) => {
    const result = checkCancellationWindowHours(hours)

    expect(isOk(result) && result.value).toBe(hours)
  })

  it.each([-1, MAX_CANCELLATION_WINDOW_HOURS + 1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza %s horas sin lanzar',
    (hours) => {
      const result = checkCancellationWindowHours(hours)

      expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_CANCELLATION_WINDOW')
    },
  )
})
