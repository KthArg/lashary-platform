import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listClientsAction } from '../actions/clients-actions'
import { CLIENTS_ERROR_MESSAGES, CLIENTS_LIST_LIMITS } from '@/features/clients'

/** La lista de /admin/clients sale de clients_profiles, no de datos quemados (PERF-002, PERF-005). */
let dbResult: { data: unknown; error: unknown }
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const mockFrom = vi.fn(() => ({
  select: (columns: string) => {
    mockSelect(columns)
    return {
      order: (column: string, options: unknown) => {
        mockOrder(column, options)
        return { range: async (from: number, to: number) => { mockRange(from, to); return dbResult } }
      },
    }
  },
}))
const mockRequireAdmin = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ from: mockFrom })) }))
vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const row = { id: 'c-1', full_name: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: null }
const { pageSize } = CLIENTS_LIST_LIMITS

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ role: 'admin' })
  dbResult = { data: [row], error: null }
})

describe('listClientsAction', () => {
  it('lee la primera pagina con limite, las mas recientes primero, solo las columnas usadas', async () => {
    const result = await listClientsAction()
    expect(mockFrom).toHaveBeenCalledWith('clients_profiles')
    expect(mockSelect).toHaveBeenCalledWith('id, full_name, phone, email, notes')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockRange).toHaveBeenCalledWith(0, pageSize - 1)
    expect(result).toEqual({ ok: true, clients: [{ id: 'c-1', fullName: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: '' }] })
  })

  it('pagina en el servidor, y un numero de pagina invalido lee la primera', async () => {
    await listClientsAction(2)
    expect(mockRange).toHaveBeenLastCalledWith(2 * pageSize, 3 * pageSize - 1)
    for (const bad of [-1, 1.5, Number.NaN]) {
      await listClientsAction(bad)
      expect(mockRange).toHaveBeenLastCalledWith(0, pageSize - 1)
    }
  })

  it('reporta el fallo de lectura en vez de devolver una lista vacia', async () => {
    dbResult = { data: null, error: { message: 'permission denied for table clients_profiles' } }
    expect(await listClientsAction()).toEqual({ ok: false, error: CLIENTS_ERROR_MESSAGES.loadFailed })
  })

  it('exige sesion de administradora antes de leer', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT:/admin'))
    await expect(listClientsAction()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
