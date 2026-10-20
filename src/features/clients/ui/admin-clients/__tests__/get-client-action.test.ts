import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getClientAction } from '../actions/client-actions'
import { CLIENTS_ERROR_MESSAGES } from '../constants/client-strings'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const row = { id: CLIENT_ID, full_name: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: null }

let lookup: { data: unknown; error: unknown }
const mockEq = vi.fn()
const mockFrom = vi.fn(() => ({
  select: () => ({
    eq: (column: string, value: string) => {
      mockEq(column, value)
      return { maybeSingle: async () => lookup }
    },
  }),
}))
const mockRequireAdmin = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ from: mockFrom })) }))
vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' })
  lookup = { data: row, error: null }
})

describe('getClientAction — los datos de la ficha de la clienta', () => {
  it('lee a la clienta por su id', async () => {
    const result = await getClientAction(CLIENT_ID)
    expect(result).toEqual({ ok: true, client: { id: CLIENT_ID, fullName: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: '' } })
    expect(mockFrom).toHaveBeenCalledWith('clients_profiles')
    expect(mockEq).toHaveBeenCalledWith('id', CLIENT_ID)
  })

  it('una clienta que no existe, o que RLS no deja ver, es no encontrada (SEC-005)', async () => {
    lookup = { data: null, error: null }
    expect(await getClientAction(CLIENT_ID)).toEqual({
      ok: false, reason: 'not-found', error: CLIENTS_ERROR_MESSAGES.clientNotFound,
    })
  })

  it('un id mal formado es no encontrado sin consultar la base', async () => {
    expect(await getClientAction('../otra')).toMatchObject({ ok: false, reason: 'not-found' })
    expect(mockRequireAdmin).toHaveBeenCalled()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('si la base falla, lo distingue de una clienta inexistente', async () => {
    lookup = { data: null, error: { message: 'caída' } }
    expect(await getClientAction(CLIENT_ID)).toEqual({
      ok: false, reason: 'failed', error: CLIENTS_ERROR_MESSAGES.loadClientFailed,
    })
  })
})
