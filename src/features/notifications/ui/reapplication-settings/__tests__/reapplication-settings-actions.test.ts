import { describe, it, expect, vi } from 'vitest'
import { setAnticipationDaysAction } from '../actions/reapplication-settings-actions'
import { reapplicationSettingsMessages as copy, REAPPLICATION_SETTINGS_PATH } from '../constants/reapplication-settings-strings'
import { REAPPLICATION_ANTICIPATION_DAYS_MAX, REAPPLICATION_ANTICIPATION_DAYS_MIN } from '@/features/notifications/domain/reapplication-reminder'

const invalidMessage = copy.invalid(REAPPLICATION_ANTICIPATION_DAYS_MIN, REAPPLICATION_ANTICIPATION_DAYS_MAX)

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

describe('setAnticipationDaysAction', () => {
  it('guarda la anticipación, exige sesión de administradora y refresca la pantalla', async () => {
    rpcResponse = { data: 14, error: null }
    rpcCalls.length = 0

    const result = await setAnticipationDaysAction({ anticipationDays: 14 })

    expect(result).toEqual({ ok: true, anticipationDays: 14 })
    expect(mockRequireAdmin).toHaveBeenCalledOnce()
    expect(rpcCalls).toEqual([['notifications_set_reapplication_anticipation_days', { p_days: 14 }]])
    expect(mockRevalidate).toHaveBeenCalledWith(REAPPLICATION_SETTINGS_PATH)
  })

  it.each([[0], [31], [7.5], ['7'], [null], [Number.NaN]])(
    'rechaza %o sin tocar la base ni refrescar',
    async (anticipationDays) => {
      rpcCalls.length = 0
      mockRevalidate.mockClear()

      const result = await setAnticipationDaysAction({ anticipationDays })

      expect(result).toEqual({ ok: false, error: invalidMessage })
      expect(rpcCalls).toEqual([])
      expect(mockRevalidate).not.toHaveBeenCalled()
    },
  )

  it('rechaza una entrada sin el campo', async () => {
    const result = await setAnticipationDaysAction({})

    expect(result).toEqual({ ok: false, error: invalidMessage })
  })

  it('traduce el rechazo de la base por un valor fuera de rango', async () => {
    rpcResponse = { data: null, error: { message: 'notifications_invalid_anticipation_days', code: '22023' } }

    const result = await setAnticipationDaysAction({ anticipationDays: 31 })

    expect(result).toEqual({ ok: false, error: invalidMessage })
  })

  it('cualquier otro error de la base es un fallo de guardado genérico', async () => {
    rpcResponse = { data: null, error: { message: 'permission denied', code: '42501' } }

    const result = await setAnticipationDaysAction({ anticipationDays: 10 })

    expect(result).toEqual({ ok: false, error: copy.saveFailed })
  })
})
