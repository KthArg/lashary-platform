import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listClientsAction } from '../actions/clients-actions'
import { CLIENTS_ERROR_MESSAGES, CLIENTS_LIST_LIMITS } from '@/features/clients'

let dbResult: { data: unknown; error: unknown; count: number | null }
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockIlike = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const chain = {
  select: (...args: unknown[]) => { mockSelect(...args); return chain },
  ilike: (...args: unknown[]) => { mockIlike(...args); return chain },
  order: (...args: unknown[]) => { mockOrder(...args); return chain },
  range: async (...args: unknown[]) => { mockRange(...args); return dbResult },
}
const mockRequireAdmin = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: (table: string) => { mockFrom(table); return chain } })),
}))
vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const row = { id: 'c-1', full_name: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: null }
const { defaultPageSize, pageSizes } = CLIENTS_LIST_LIMITS

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ role: 'admin' })
  dbResult = { data: [row], error: null, count: 31 }
})

describe('listClientsAction', () => {
  it('sin parametros lee la primera pagina por defecto, las mas recientes primero, solo las columnas usadas y con el total', async () => {
    const result = await listClientsAction()
    expect(mockFrom).toHaveBeenCalledWith('clients_profiles')
    expect(mockSelect).toHaveBeenCalledWith('id, full_name, phone, email, notes', { count: 'exact' })
    expect(mockIlike).not.toHaveBeenCalled()
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockRange).toHaveBeenCalledWith(0, defaultPageSize - 1)
    expect(result).toEqual({
      ok: true, total: 31, page: 0, pageSize: defaultPageSize,
      clients: [{ id: 'c-1', fullName: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: '' }],
    })
  })

  it('criterio 3: pagina en el servidor con el tamano elegido entre los permitidos', async () => {
    for (const size of pageSizes) {
      const result = await listClientsAction({ page: 2, pageSize: size })
      expect(mockRange).toHaveBeenLastCalledWith(2 * size, 3 * size - 1)
      expect(result).toMatchObject({ ok: true, page: 2, pageSize: size })
    }
  })

  it('criterio 3 y PERF-002: una pagina o un tamano invalidos no pasan a la consulta', async () => {
    for (const page of [-1, 1.5, Number.NaN, '3']) {
      await listClientsAction({ page: page as number })
      expect(mockRange).toHaveBeenLastCalledWith(0, defaultPageSize - 1)
    }
    for (const pageSize of [99999, 0, -10, 24, '50']) {
      const result = await listClientsAction({ pageSize: pageSize as number })
      expect(mockRange).toHaveBeenLastCalledWith(0, defaultPageSize - 1)
      expect(result).toMatchObject({ pageSize: defaultPageSize })
    }
  })

  it('criterio 2: filtra por nombre sin distinguir mayusculas, y el total es el del filtro', async () => {
    dbResult = { data: [row], error: null, count: 1 }
    const result = await listClientsAction({ name: '  ana  ' })
    expect(mockIlike).toHaveBeenCalledWith('full_name', '%ana%')
    expect(result).toMatchObject({ ok: true, total: 1 })
  })

  it('criterio 2: los comodines que escribe la administradora se buscan como texto', async () => {
    await listClientsAction({ name: '50%_a\\b*' })
    expect(mockIlike).toHaveBeenCalledWith('full_name', '%50\\%\\_a\\\\b%')
  })

  it('criterio 2: un nombre vacio, solo espacios o que no es texto no filtra', async () => {
    for (const name of ['', '   ', '**', 42, null]) {
      await listClientsAction({ name: name as string })
    }
    expect(mockIlike).not.toHaveBeenCalled()
  })

  it('criterio 2: el filtro se recorta al largo maximo del nombre', async () => {
    await listClientsAction({ name: 'a'.repeat(CLIENTS_LIST_LIMITS.nameFilterMaxLength + 50) })
    expect(mockIlike).toHaveBeenCalledWith('full_name', `%${'a'.repeat(CLIENTS_LIST_LIMITS.nameFilterMaxLength)}%`)
  })

  it('reporta el fallo de lectura en vez de devolver una lista vacia', async () => {
    dbResult = { data: null, error: { message: 'permission denied for table clients_profiles' }, count: null }
    expect(await listClientsAction()).toEqual({ ok: false, error: CLIENTS_ERROR_MESSAGES.loadFailed })
  })

  it('exige sesion de administradora antes de leer', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT:/admin'))
    await expect(listClientsAction({ page: 1, name: 'ana' })).rejects.toThrow('NEXT_REDIRECT')
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
