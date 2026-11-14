import { describe, it, expect } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import {
  computeReapplicationDueDate,
  isReapplicationDue,
  isValidAnticipationDays,
  reapplicationCycleKey,
  REAPPLICATION_ANTICIPATION_DAYS_MIN,
  REAPPLICATION_ANTICIPATION_DAYS_MAX,
  REAPPLICATION_ANTICIPATION_DAYS_DEFAULT,
} from '../reapplication-reminder'

describe('computeReapplicationDueDate', () => {
  it('suma el intervalo del catálogo a la última cita completada', () => {
    expect(computeReapplicationDueDate(fixedDate('2026-10-01T10:00:00Z'), 30)).toEqual(
      fixedDate('2026-10-31T10:00:00Z'),
    )
  })

  it('con intervalo 0 la fecha estimada es la de la última cita', () => {
    expect(computeReapplicationDueDate(fixedDate('2026-10-01T10:00:00Z'), 0)).toEqual(
      fixedDate('2026-10-01T10:00:00Z'),
    )
  })
})

describe('isReapplicationDue', () => {
  const dueDate = fixedDate('2026-11-20T00:00:00Z')

  it('no está vencida fuera de la ventana de anticipación', () => {
    expect(isReapplicationDue(dueDate, 7, fixedDate('2026-11-10T00:00:00Z'))).toBe(false)
  })

  it('entra justo al cruzar el umbral de anticipación', () => {
    expect(isReapplicationDue(dueDate, 7, fixedDate('2026-11-13T00:00:00Z'))).toBe(true)
  })

  it('sigue avisando aunque la fecha estimada ya haya pasado', () => {
    expect(isReapplicationDue(dueDate, 7, fixedDate('2026-11-25T00:00:00Z'))).toBe(true)
  })
})

describe('isValidAnticipationDays', () => {
  it.each([REAPPLICATION_ANTICIPATION_DAYS_MIN, REAPPLICATION_ANTICIPATION_DAYS_DEFAULT, REAPPLICATION_ANTICIPATION_DAYS_MAX])(
    'acepta %i dentro del rango',
    (days) => {
      expect(isValidAnticipationDays(days)).toBe(true)
    },
  )

  it.each([0, -1, 31, 1.5, '7', null, undefined])('rechaza %o fuera del rango o no entero', (value) => {
    expect(isValidAnticipationDays(value)).toBe(false)
  })
})

describe('reapplicationCycleKey', () => {
  it('es la misma clave para el mismo trío y distinta si cambia cualquiera de los tres', () => {
    const lastCompletedAt = fixedDate('2026-09-01T17:00:00Z')
    const key = reapplicationCycleKey('client-1', 'tecnica-1', lastCompletedAt)

    expect(reapplicationCycleKey('client-1', 'tecnica-1', lastCompletedAt)).toBe(key)
    expect(reapplicationCycleKey('client-2', 'tecnica-1', lastCompletedAt)).not.toBe(key)
    expect(reapplicationCycleKey('client-1', 'tecnica-2', lastCompletedAt)).not.toBe(key)
    expect(reapplicationCycleKey('client-1', 'tecnica-1', fixedDate('2026-10-01T17:00:00Z'))).not.toBe(key)
  })
})
