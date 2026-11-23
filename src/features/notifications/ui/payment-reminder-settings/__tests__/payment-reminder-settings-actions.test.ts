import { describe, it, expect, vi } from 'vitest'
import { setFrequencyDaysAction } from '../actions/payment-reminder-settings-actions'
import { paymentReminderSettingsMessages as copy, PAYMENT_REMINDER_SETTINGS_PATH } from '../constants/payment-reminder-settings-strings'
import { PAYMENT_REMINDER_FREQUENCY_DAYS_MAX, PAYMENT_REMINDER_FREQUENCY_DAYS_MIN } from '@/features/notifications/domain/payment-reminder'

const invalidMessage = copy.invalid(PAYMENT_REMINDER_FREQUENCY_DAYS_MIN, PAYMENT_REMINDER_FREQUENCY_DAYS_MAX)
const SET_FREQUENCY_FUNCTION = 'notifications_set_payment_reminder_frequency_days'
const PG_INVALID_PARAMETER = '22023'
const PG_INSUFFICIENT_PRIVILEGE = '42501'

type FakeRpc = { data: unknown; error: { message: string; code?: string } | null }

let rpcResponse: FakeRpc
const rpcCalls: unknown[][] = []
const mockRequireAdmin = vi.fn()
const mockRevalidate = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc: async (name: string, args: unknown) => (rpcCalls.push([name, args]), rpcResponse),
  })),
}))
vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => mockRevalidate(...args) }))

describe('setFrequencyDaysAction', () => {
  it('guarda la frecuencia, exige sesión de administradora y refresca la pantalla (criterio 1)', async () => {
    rpcResponse = { data: 14, error: null }
    rpcCalls.length = 0

    const result = await setFrequencyDaysAction({ frequencyDays: 14 })

    expect(result).toEqual({ ok: true, frequencyDays: 14 })
    expect(mockRequireAdmin).toHaveBeenCalledOnce()
    expect(rpcCalls).toEqual([[SET_FREQUENCY_FUNCTION, { p_days: 14 }]])
    expect(mockRevalidate).toHaveBeenCalledWith(PAYMENT_REMINDER_SETTINGS_PATH)
  })

  it.each([[0], [31], [7.5], ['7'], [null], [Number.NaN]])('rechaza %o sin tocar la base ni refrescar', async (frequencyDays) => {
    rpcCalls.length = 0
    mockRevalidate.mockClear()

    const result = await setFrequencyDaysAction({ frequencyDays })

    expect(result).toEqual({ ok: false, error: invalidMessage })
    expect(rpcCalls).toEqual([])
    expect(mockRevalidate).not.toHaveBeenCalled()
  })

  it('rechaza una entrada sin el campo', async () => {
    const result = await setFrequencyDaysAction({})

    expect(result).toEqual({ ok: false, error: invalidMessage })
  })

  it('traduce el rechazo de la base por un valor fuera de rango', async () => {
    rpcResponse = { data: null, error: { message: 'notifications_invalid_payment_reminder_frequency_days', code: PG_INVALID_PARAMETER } }

    const result = await setFrequencyDaysAction({ frequencyDays: 30 })

    expect(result).toEqual({ ok: false, error: invalidMessage })
  })

  it('cualquier otro error de la base es un fallo de guardado genérico', async () => {
    rpcResponse = { data: null, error: { message: 'permission denied', code: PG_INSUFFICIENT_PRIVILEGE } }

    const result = await setFrequencyDaysAction({ frequencyDays: 10 })

    expect(result).toEqual({ ok: false, error: copy.saveFailed })
  })
})
