import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  decideCaseAction,
  forgiveCaseAction,
  liftCaseAction,
  setGraceDaysAction,
} from '@/features/delinquency/ui/review/actions/review-actions'
import { DELINQUENCY_ADMIN_PATH, REVIEW_ERRORS } from '@/features/delinquency/ui/review/constants/review-strings'

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'

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

const row = {
  id: CASE_ID,
  client_id: '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21',
  appointment_id: '2d7e2a1f-6b5c-4f1f-9e63-1e7b4f7a0b32',
  pending: 20000,
  state: 'active',
  detected_at: '2026-11-01T15:00:00+00:00',
  decided_at: '2026-11-06T15:00:00+00:00',
}

beforeEach(() => {
  vi.clearAllMocks()
  rpcCalls.length = 0
  rpcResponse = { data: row, error: null }
  mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })
})

describe('decideCaseAction', () => {
  it('confirma la morosidad, exige sesión de administradora y refresca la pantalla', async () => {
    const result = await decideCaseAction({ caseId: CASE_ID, decision: 'confirm' })

    expect(result).toEqual({ ok: true, state: 'active' })
    expect(mockRequireAdmin).toHaveBeenCalledOnce()
    expect(rpcCalls).toEqual([['delinquency_decide_case', { p_case_id: CASE_ID, p_decision: 'confirm' }]])
    expect(mockRevalidate).toHaveBeenCalledWith(DELINQUENCY_ADMIN_PATH)
  })

  it('rechaza una entrada que no es una decisión conocida sin tocar la base', async () => {
    const result = await decideCaseAction({ caseId: CASE_ID, decision: 'perdonar' })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.invalidInput })
    expect(rpcCalls).toHaveLength(0)
    expect(mockRevalidate).not.toHaveBeenCalled()
  })

  it('rechaza un identificador que no es un uuid', async () => {
    const result = await decideCaseAction({ caseId: 'no-es-un-uuid', decision: 'dismiss' })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.invalidInput })
  })

  it('avisa si la morosidad ya se decidió o ya no existe, y no refresca', async () => {
    rpcResponse = { data: null, error: { message: 'x', code: '55000' } }
    const decided = await decideCaseAction({ caseId: CASE_ID, decision: 'confirm' })

    rpcResponse = { data: null, error: { message: 'x', code: 'P0002' } }
    const missing = await decideCaseAction({ caseId: CASE_ID, decision: 'confirm' })

    expect(decided).toEqual({ ok: false, error: REVIEW_ERRORS.alreadyDecided })
    expect(missing).toEqual({ ok: false, error: REVIEW_ERRORS.notFound })
    expect(mockRevalidate).not.toHaveBeenCalled()
  })

  it('un fallo de la base se dice sin mostrar el texto interno', async () => {
    rpcResponse = { data: null, error: { message: 'connection reset by peer', code: '08006' } }

    const result = await decideCaseAction({ caseId: CASE_ID, decision: 'confirm' })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.saveFailed })
  })
})

describe('setGraceDaysAction', () => {
  it('guarda la gracia, exige sesión de administradora y refresca la pantalla', async () => {
    rpcResponse = { data: 14, error: null }

    const result = await setGraceDaysAction({ graceDays: 14 })

    expect(result).toEqual({ ok: true, graceDays: 14 })
    expect(mockRequireAdmin).toHaveBeenCalledOnce()
    expect(rpcCalls).toEqual([['delinquency_set_grace_days', { p_days: 14 }]])
    expect(mockRevalidate).toHaveBeenCalledWith(DELINQUENCY_ADMIN_PATH)
  })

  it.each([[0], [91], [7.5], ['7'], [null], [Number.NaN]])(
    'rechaza %o sin tocar la base ni refrescar',
    async (graceDays) => {
      const result = await setGraceDaysAction({ graceDays })

      expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.invalidGraceDays })
      expect(rpcCalls).toEqual([])
      expect(mockRevalidate).not.toHaveBeenCalled()
    },
  )

  it('rechaza una entrada sin el campo', async () => {
    const result = await setGraceDaysAction({})

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.invalidGraceDays })
  })

  it('si la base rechaza el valor, lo dice como valor inválido', async () => {
    rpcResponse = { data: null, error: { message: 'delinquency_invalid_grace_days', code: '22023' } }

    const result = await setGraceDaysAction({ graceDays: 30 })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.invalidGraceDays })
    expect(mockRevalidate).not.toHaveBeenCalled()
  })

  it('un fallo de la base se dice sin mostrar el texto interno', async () => {
    rpcResponse = { data: null, error: { message: 'connection reset by peer', code: '08006' } }

    const result = await setGraceDaysAction({ graceDays: 30 })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.graceSaveFailed })
  })
})

describe('liftCaseAction', () => {
  it('levanta el bloqueo, exige sesión de administradora y refresca la pantalla', async () => {
    rpcResponse = { data: { ...row, state: 'lifted', exception_amount: null }, error: null }

    const result = await liftCaseAction({ caseId: CASE_ID, reason: 'la clienta ya pagó en efectivo' })

    expect(result).toEqual({ ok: true, state: 'lifted' })
    expect(mockRequireAdmin).toHaveBeenCalledOnce()
    expect(rpcCalls).toEqual([
      ['delinquency_lift_case', { p_case_id: CASE_ID, p_reason: 'la clienta ya pagó en efectivo' }],
    ])
    expect(mockRevalidate).toHaveBeenCalledWith(DELINQUENCY_ADMIN_PATH)
  })

  it('rechaza un identificador que no es un uuid sin tocar la base', async () => {
    const result = await liftCaseAction({ caseId: 'no-es-un-uuid', reason: 'motivo' })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.invalidInput })
    expect(rpcCalls).toHaveLength(0)
  })

  it('rechaza un motivo vacío sin tocar la base', async () => {
    const result = await liftCaseAction({ caseId: CASE_ID, reason: '   ' })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.invalidReason })
    expect(rpcCalls).toHaveLength(0)
  })

  it('avisa si la morosidad no existe o ya no está activa, y no refresca', async () => {
    rpcResponse = { data: null, error: { message: 'x', code: 'P0002' } }
    const missing = await liftCaseAction({ caseId: CASE_ID, reason: 'motivo' })

    rpcResponse = { data: null, error: { message: 'x', code: '55001' } }
    const notActive = await liftCaseAction({ caseId: CASE_ID, reason: 'motivo' })

    expect(missing).toEqual({ ok: false, error: REVIEW_ERRORS.notFound })
    expect(notActive).toEqual({ ok: false, error: REVIEW_ERRORS.caseNotActive })
    expect(mockRevalidate).not.toHaveBeenCalled()
  })

  it('un fallo de la base se dice sin mostrar el texto interno', async () => {
    rpcResponse = { data: null, error: { message: 'connection reset by peer', code: '08006' } }

    const result = await liftCaseAction({ caseId: CASE_ID, reason: 'motivo' })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.liftFailed })
  })
})

describe('forgiveCaseAction', () => {
  it('condona el monto, exige sesión de administradora y refresca la pantalla', async () => {
    rpcResponse = { data: { ...row, state: 'active', exception_amount: 4000 }, error: null }

    const result = await forgiveCaseAction({ caseId: CASE_ID, amount: 4000, reason: 'condonación parcial aprobada' })

    expect(result).toEqual({ ok: true, state: 'active', exceptionAmount: 4000 })
    expect(mockRequireAdmin).toHaveBeenCalledOnce()
    expect(rpcCalls).toEqual([
      [
        'delinquency_forgive_case',
        { p_case_id: CASE_ID, p_amount: 4000, p_reason: 'condonación parcial aprobada' },
      ],
    ])
    expect(mockRevalidate).toHaveBeenCalledWith(DELINQUENCY_ADMIN_PATH)
  })

  it('cierra la morosidad como condonada cuando el saldo vivo llega a cero', async () => {
    rpcResponse = { data: { ...row, state: 'forgiven', exception_amount: 20000 }, error: null }

    const result = await forgiveCaseAction({ caseId: CASE_ID, amount: 20000, reason: 'condonación total' })

    expect(result).toEqual({ ok: true, state: 'forgiven', exceptionAmount: 20000 })
  })

  it('rechaza un identificador que no es un uuid sin tocar la base', async () => {
    const result = await forgiveCaseAction({ caseId: 'no-es-un-uuid', amount: 1000, reason: 'motivo' })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.invalidInput })
    expect(rpcCalls).toHaveLength(0)
  })

  it('rechaza un monto inválido y lo distingue de un motivo inválido (M2)', async () => {
    const negative = await forgiveCaseAction({ caseId: CASE_ID, amount: -1, reason: 'motivo' })
    const zero = await forgiveCaseAction({ caseId: CASE_ID, amount: 0, reason: 'motivo' })
    const decimal = await forgiveCaseAction({ caseId: CASE_ID, amount: 10.5, reason: 'motivo' })

    expect(negative).toEqual({ ok: false, error: REVIEW_ERRORS.invalidForgiveAmount })
    expect(zero).toEqual({ ok: false, error: REVIEW_ERRORS.invalidForgiveAmount })
    expect(decimal).toEqual({ ok: false, error: REVIEW_ERRORS.invalidForgiveAmount })
    expect(rpcCalls).toHaveLength(0)
  })

  it('rechaza un motivo vacío y lo distingue de un monto inválido (M2)', async () => {
    const result = await forgiveCaseAction({ caseId: CASE_ID, amount: 4000, reason: '   ' })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.invalidReason })
    expect(rpcCalls).toHaveLength(0)
  })

  it('si el monto y el motivo son inválidos a la vez, avisa primero del monto', async () => {
    const result = await forgiveCaseAction({ caseId: CASE_ID, amount: 0, reason: '' })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.invalidForgiveAmount })
  })

  it('avisa si la morosidad no existe, ya no está activa, o la base rechaza el monto', async () => {
    rpcResponse = { data: null, error: { message: 'x', code: 'P0002' } }
    const missing = await forgiveCaseAction({ caseId: CASE_ID, amount: 4000, reason: 'motivo' })

    rpcResponse = { data: null, error: { message: 'x', code: '55001' } }
    const notActive = await forgiveCaseAction({ caseId: CASE_ID, amount: 4000, reason: 'motivo' })

    rpcResponse = { data: null, error: { message: 'delinquency_invalid_forgive_amount', code: '22023' } }
    const invalidAmount = await forgiveCaseAction({ caseId: CASE_ID, amount: 999999, reason: 'motivo' })

    expect(missing).toEqual({ ok: false, error: REVIEW_ERRORS.notFound })
    expect(notActive).toEqual({ ok: false, error: REVIEW_ERRORS.caseNotActive })
    expect(invalidAmount).toEqual({ ok: false, error: REVIEW_ERRORS.invalidForgiveAmount })
    expect(mockRevalidate).not.toHaveBeenCalled()
  })

  it('un fallo de la base se dice sin mostrar el texto interno', async () => {
    rpcResponse = { data: null, error: { message: 'connection reset by peer', code: '08006' } }

    const result = await forgiveCaseAction({ caseId: CASE_ID, amount: 4000, reason: 'motivo' })

    expect(result).toEqual({ ok: false, error: REVIEW_ERRORS.forgiveFailed })
  })
})
