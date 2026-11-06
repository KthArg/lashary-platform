import { describe, it, expect } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import type { ReminderAttempt } from '../reminder-attempt'

const context = { reminderId: 'rem-1', attemptNumber: 1, attemptedAt: fixedDate('2026-11-01T15:00:01Z') }

describe('ReminderAttempt', () => {
  it('el tipo rechaza las combinaciones que el CHECK de la base también rechaza', () => {
    // @ts-expect-error un envío exitoso no lleva error
    const sentWithError: ReminderAttempt = { ...context, channel: 'email', outcome: 'sent', error: 'contradice' }
    // @ts-expect-error un fallo de envío exige canal
    const failedWithoutChannel: ReminderAttempt = { ...context, channel: null, outcome: 'failed', error: 'sin canal' }
    // @ts-expect-error sin contacto no lleva canal
    const noContactWithChannel: ReminderAttempt = { ...context, channel: 'email', outcome: 'no_contact', error: 'sin contacto' }

    expect([sentWithError, failedWithoutChannel, noContactWithChannel]).toHaveLength(3)
  })
})
