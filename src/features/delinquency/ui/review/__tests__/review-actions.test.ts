import { describe, it, expect, vi, beforeEach } from 'vitest'
import { decideCaseAction, setGraceDaysAction } from '@/features/delinquency/ui/review/actions/review-actions'
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
