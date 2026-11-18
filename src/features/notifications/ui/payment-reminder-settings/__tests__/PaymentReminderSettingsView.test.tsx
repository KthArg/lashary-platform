import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PAYMENT_REMINDER_SETTINGS_PATH, paymentReminderSettingsMessages as copy } from '../constants/payment-reminder-settings-strings'
import { PaymentReminderSettingsView } from '../components/PaymentReminderSettingsView'
import { PaymentReminderSettingsLoading } from '../components/PaymentReminderSettingsLoading'
import { PAYMENT_REMINDER_FREQUENCY_DAYS_MAX, PAYMENT_REMINDER_FREQUENCY_DAYS_MIN } from '@/features/notifications/domain/payment-reminder'

vi.mock('../actions/payment-reminder-settings-actions', () => ({
  setFrequencyDaysAction: vi.fn(),
}))

afterEach(cleanup)

const fieldLabel = copy.label(PAYMENT_REMINDER_FREQUENCY_DAYS_MIN, PAYMENT_REMINDER_FREQUENCY_DAYS_MAX)
const CURRENT_FREQUENCY_DAYS = 7

describe('PaymentReminderSettingsView', () => {
  it('con la configuración cargada muestra el título y el formulario con los días vigentes', () => {
    render(<PaymentReminderSettingsView view={{ status: 'ready', frequencyDays: CURRENT_FREQUENCY_DAYS }} />)

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeTruthy()
    const input = screen.getByLabelText(fieldLabel) as HTMLInputElement
    expect(input.value).toBe(String(CURRENT_FREQUENCY_DAYS))
    expect(screen.getByRole('button', { name: copy.save })).toBeTruthy()
  })

  it('si falló la carga avisa con role=alert y ofrece reintentar, sin formulario (UI-003)', () => {
    render(<PaymentReminderSettingsView view={{ status: 'error' }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.loadFailed)
    expect(screen.getByRole('link', { name: copy.reload }).getAttribute('href')).toBe(PAYMENT_REMINDER_SETTINGS_PATH)
    expect(screen.queryByLabelText(fieldLabel)).toBeNull()
  })
})

describe('PaymentReminderSettingsLoading', () => {
  it('mientras carga muestra el título y avisa con role=status (UI-003)', () => {
    render(<PaymentReminderSettingsLoading />)

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain(copy.loading)
  })
})
