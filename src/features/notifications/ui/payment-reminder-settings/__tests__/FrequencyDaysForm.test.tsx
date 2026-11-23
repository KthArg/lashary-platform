import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { paymentReminderSettingsMessages as copy } from '../constants/payment-reminder-settings-strings'
import { FrequencyDaysForm } from '../components/FrequencyDaysForm'
import { PAYMENT_REMINDER_FREQUENCY_DAYS_MAX, PAYMENT_REMINDER_FREQUENCY_DAYS_MIN } from '@/features/notifications/domain/payment-reminder'
import type { SetFrequencyDaysActionResult } from '../types/payment-reminder-settings.types'

const mockAction = vi.fn<(input: unknown) => Promise<SetFrequencyDaysActionResult>>()
const fieldLabel = copy.label(PAYMENT_REMINDER_FREQUENCY_DAYS_MIN, PAYMENT_REMINDER_FREQUENCY_DAYS_MAX)
const invalidMessage = copy.invalid(PAYMENT_REMINDER_FREQUENCY_DAYS_MIN, PAYMENT_REMINDER_FREQUENCY_DAYS_MAX)
const CURRENT_FREQUENCY_DAYS = 7
const NEW_FREQUENCY_DAYS = 14

vi.mock('../actions/payment-reminder-settings-actions', () => ({
  setFrequencyDaysAction: (input: unknown) => mockAction(input),
}))

beforeEach(() => mockAction.mockReset())
afterEach(cleanup)

const submitWith = (days: string) => {
  fireEvent.change(screen.getByLabelText(fieldLabel), { target: { value: days } })
  fireEvent.click(screen.getByRole('button', { name: copy.save }))
}

describe('FrequencyDaysForm', () => {
  it('al guardar manda los días escritos y avisa con role=status', async () => {
    mockAction.mockResolvedValue({ ok: true, frequencyDays: NEW_FREQUENCY_DAYS })
    render(<FrequencyDaysForm frequencyDays={CURRENT_FREQUENCY_DAYS} />)
    submitWith(String(NEW_FREQUENCY_DAYS))

    expect((await screen.findByRole('status')).textContent).toBe(copy.saved)
    expect(mockAction).toHaveBeenCalledWith({ frequencyDays: NEW_FREQUENCY_DAYS })
  })

  it('con un fallo avisa el error dentro del mismo role=status (región viva)', async () => {
    mockAction.mockResolvedValue({ ok: false, error: copy.saveFailed })
    render(<FrequencyDaysForm frequencyDays={CURRENT_FREQUENCY_DAYS} />)
    submitWith(String(NEW_FREQUENCY_DAYS))

    expect((await screen.findByRole('status')).textContent).toBe(copy.saveFailed)
  })

  it('mientras guarda deshabilita el botón y lo dice', async () => {
    let finish: (result: SetFrequencyDaysActionResult) => void = () => {}
    mockAction.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<FrequencyDaysForm frequencyDays={CURRENT_FREQUENCY_DAYS} />)
    submitWith(String(NEW_FREQUENCY_DAYS))

    const saving = (await screen.findByRole('button', { name: copy.saving })) as HTMLButtonElement
    expect(saving.disabled).toBe(true)
    finish({ ok: true, frequencyDays: NEW_FREQUENCY_DAYS })
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(copy.saved))
  })

  it('sin enviar nada no hay ningún aviso', () => {
    render(<FrequencyDaysForm frequencyDays={CURRENT_FREQUENCY_DAYS} />)

    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('un campo vacío manda NaN, que la acción rechaza, sin romper el formulario', async () => {
    mockAction.mockResolvedValue({ ok: false, error: invalidMessage })
    render(<FrequencyDaysForm frequencyDays={CURRENT_FREQUENCY_DAYS} />)
    submitWith('')

    expect((await screen.findByRole('status')).textContent).toBe(invalidMessage)
    expect(mockAction).toHaveBeenCalledWith({ frequencyDays: Number.NaN })
  })
})
