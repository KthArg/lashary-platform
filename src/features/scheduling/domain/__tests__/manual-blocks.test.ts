import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { createManualBlock } from '../manual-blocks'
import { MAX_MANUAL_BLOCK_REASON_LENGTH } from '../manual-blocks.constants'
import { isManualBlockInvalid } from '../availability-errors'

const base = {
  id: 'm-1',
  resourceId: 'r-1',
  startsAt: fixedDate('2026-10-20T15:00:00Z'),
  endsAt: fixedDate('2026-10-20T17:00:00Z'),
}

describe('createManualBlock — US-AGE-01, criterio 3', () => {
  it('acepta un bloqueo con motivo recortado', () => {
    const result = createManualBlock({ ...base, reason: '  cita médica ' })
    expect(isOk(result) && result.value).toEqual({ ...base, reason: 'cita médica' })
  })

  it('el motivo es opcional (vacío queda en null)', () => {
    const result = createManualBlock({ ...base, reason: '  ' })
    expect(isOk(result) && result.value.reason).toBeNull()
  })

  it('rechaza un bloqueo de duración cero o invertido', () => {
    for (const endsAt of [base.startsAt, fixedDate('2026-10-20T14:00:00Z')]) {
      const result = createManualBlock({ ...base, endsAt })
      expect(isErr(result) && isManualBlockInvalid(result.error) && result.error.problems).toEqual([
        'el inicio debe ser anterior al fin',
      ])
    }
  })

  it('rechaza instantes inválidos', () => {
    const result = createManualBlock({ ...base, startsAt: fixedDate('no es fecha') })
    expect(isErr(result) && result.error.problems).toEqual(['el inicio no es válido'])
  })

  it('el motivo llega hasta el tope, contado después de recortar (US-AGE-07)', () => {
    const longestReason = 'a'.repeat(MAX_MANUAL_BLOCK_REASON_LENGTH)
    const accepted = createManualBlock({ ...base, reason: `  ${longestReason}  ` })
    expect(isOk(accepted) && accepted.value.reason).toBe(longestReason)

    const rejected = createManualBlock({ ...base, reason: `${longestReason}a` })
    expect(isErr(rejected) && isManualBlockInvalid(rejected.error) && rejected.error.problems).toEqual([
      `el motivo supera los ${MAX_MANUAL_BLOCK_REASON_LENGTH} caracteres`,
    ])
  })
})
