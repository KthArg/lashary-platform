import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { checkConfirmationDeadlineHours, isConfirmationOverdue } from '../appointment-confirmation'
import { MAX_CONFIRMATION_DEADLINE_HOURS, MS_PER_HOUR } from '../appointment-confirmation.constants'

const NOW_MS = 1_800_000_000_000
const DEADLINE_HOURS = 48
const approvedStartingIn = (hours: number) => ({
  status: 'approved',
  clientId: 'clienta-1',
  startsAtMs: NOW_MS + hours * MS_PER_HOUR,
})

describe('isConfirmationOverdue', () => {
  it('destaca una cita aprobada que entra en el plazo', () => {
    expect(isConfirmationOverdue(approvedStartingIn(48), DEADLINE_HOURS, NOW_MS)).toBe(true)
    expect(isConfirmationOverdue(approvedStartingIn(1), DEADLINE_HOURS, NOW_MS)).toBe(true)
  })

  it('no destaca una cita que todavía no entra en el plazo', () => {
    expect(isConfirmationOverdue(approvedStartingIn(49), DEADLINE_HOURS, NOW_MS)).toBe(false)
  })

  it('no destaca una cita confirmada ni una pendiente', () => {
    expect(isConfirmationOverdue({ ...approvedStartingIn(1), status: 'confirmed' }, DEADLINE_HOURS, NOW_MS)).toBe(false)
    expect(isConfirmationOverdue({ ...approvedStartingIn(1), status: 'pending_approval' }, DEADLINE_HOURS, NOW_MS)).toBe(false)
  })

  it('no destaca una cita sin clienta ni una que ya empezó', () => {
    expect(isConfirmationOverdue({ ...approvedStartingIn(1), clientId: null }, DEADLINE_HOURS, NOW_MS)).toBe(false)
    expect(isConfirmationOverdue(approvedStartingIn(-1), DEADLINE_HOURS, NOW_MS)).toBe(false)
  })

  it('con plazo 0 no destaca nada', () => {
    expect(isConfirmationOverdue(approvedStartingIn(1), 0, NOW_MS)).toBe(false)
  })
})

describe('checkConfirmationDeadlineHours', () => {
  it('acepta los extremos del rango', () => {
    expect(isOk(checkConfirmationDeadlineHours(0))).toBe(true)
    expect(isOk(checkConfirmationDeadlineHours(MAX_CONFIRMATION_DEADLINE_HOURS))).toBe(true)
  })

  it('rechaza lo que no es un entero dentro del rango', () => {
    expect(isErr(checkConfirmationDeadlineHours(-1))).toBe(true)
    expect(isErr(checkConfirmationDeadlineHours(MAX_CONFIRMATION_DEADLINE_HOURS + 1))).toBe(true)
    expect(isErr(checkConfirmationDeadlineHours(1.5))).toBe(true)
  })
})
