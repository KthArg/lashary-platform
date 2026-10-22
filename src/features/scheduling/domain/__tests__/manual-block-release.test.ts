import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { isManualBlockInvalid } from '../availability-errors'
import { maxReleaseSteps, shortenedEndMs } from '../manual-block-release'

const blockFrom = (from: string, to: string) => ({ startsAt: fixedDate(from), endsAt: fixedDate(to) })
const threeHours = blockFrom('2026-10-19T14:00:00Z', '2026-10-19T17:00:00Z')

describe('maxReleaseSteps — US-AGE-07, criterio 3', () => {
  it('un bloqueo de tres horas deja liberar hasta cinco espacios de media hora, nunca todos', () => {
    expect(maxReleaseSteps(threeHours)).toBe(5)
  })

  it('un bloqueo de un solo espacio no se puede acortar, solo desbloquear', () => {
    expect(maxReleaseSteps(blockFrom('2026-10-19T14:00:00Z', '2026-10-19T14:30:00Z'))).toBe(0)
  })

  it('un bloqueo que no es múltiplo de media hora deja liberar hasta antes de quedar vacío', () => {
    expect(maxReleaseSteps(blockFrom('2026-10-19T14:00:00Z', '2026-10-19T14:45:00Z'))).toBe(1)
    expect(maxReleaseSteps(blockFrom('2026-10-19T14:10:00Z', '2026-10-19T15:00:00Z'))).toBe(1)
  })
})

describe('shortenedEndMs', () => {
  it('retrocede el fin de a espacios de media hora', () => {
    const result = shortenedEndMs(threeHours, 2)
    expect(isOk(result) && result.value).toBe(Date.parse('2026-10-19T16:00:00.000Z'))
  })

  it('liberar el máximo deja el primer espacio', () => {
    const result = shortenedEndMs(threeHours, 5)
    expect(isOk(result) && result.value).toBe(Date.parse('2026-10-19T14:30:00.000Z'))
  })

  it('rechaza cero, negativos, fracciones, NaN y pasarse del máximo', () => {
    for (const steps of [0, -1, 0.5, Number.NaN, 6, 100]) {
      const result = shortenedEndMs(threeHours, steps)
      expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    }
  })
})
