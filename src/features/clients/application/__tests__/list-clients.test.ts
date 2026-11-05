import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listClientsAction } from '../../ui/admin-clients/actions/client-actions'
import { CLIENTS_ERROR_MESSAGES, CLIENTS_LIST_LIMITS } from '@/features/clients'

let dbResult: { data: unknown; error: unknown; count: number | null }
const mockRpc = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const chain = {
  order: (...args: unknown[]) => { mockOrder(...args); return chain },
  range: async (...args: unknown[]) => { mockRange(...args); return dbResult },
}
const mockRequireAdmin = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc: (...args: unknown[]) => { mockRpc(...args); return chain } })),
}))
vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const LAST_VISIT_AT = '2026-06-30T23:30:00-06:00'
const row = {
  id: 'c-1', full_name: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: null,
  created_at: '2026-01-10T15:00:00+00:00', last_visit_at: LAST_VISIT_AT,
}
const neverVisitedRow = { ...row, id: 'c-2', full_name: 'Bea Mora', last_visit_at: null }
const { defaultPageSize, pageSizes } = CLIENTS_LIST_LIMITS

const lastRpcArgs = () => mockRpc.mock.lastCall?.[1]

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ role: 'admin' })
  dbResult = { data: [row], error: null, count: 31 }
})

describe('listClientsAction', () => {
  it('sin parametros lee la primera pagina por defecto, las mas recientes primero y con el total', async () => {
    const result = await listClientsAction()
    expect(mockRpc).toHaveBeenCalledWith(
      'clients_list',
      { p_name_pattern: null, p_visit_from: null, p_visit_to: null },
      { count: 'exact' },
    )
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockRange).toHaveBeenCalledWith(0, defaultPageSize - 1)
    expect(result).toEqual({
      ok: true, total: 31, page: 0, pageSize: defaultPageSize,
      clients: [{
        id: 'c-1', fullName: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: '',
        lastVisitAtMs: Date.parse(LAST_VISIT_AT),
      }],
    })
  })

  it('criterio 1: una clienta que nunca vino llega sin ultima visita, no con una fecha inventada', async () => {
    dbResult = { data: [neverVisitedRow], error: null, count: 1 }
    const result = await listClientsAction()
    expect(result).toMatchObject({ ok: true, clients: [{ id: 'c-2', lastVisitAtMs: null }] })
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
    expect(lastRpcArgs()).toMatchObject({ p_name_pattern: '%ana%' })
    expect(result).toMatchObject({ ok: true, total: 1 })
  })

  it('criterio 2: los comodines que escribe la administradora se buscan como texto', async () => {
    await listClientsAction({ name: '50%_a\\b*' })
    expect(lastRpcArgs()).toMatchObject({ p_name_pattern: '%50\\%\\_a\\\\b%' })
  })

  it('criterio 2: un nombre vacio, solo espacios o que no es texto no filtra', async () => {
    for (const name of ['', '   ', '**', 42, null]) {
      await listClientsAction({ name: name as string })
      expect(lastRpcArgs()).toMatchObject({ p_name_pattern: null })
    }
  })

  it('criterio 2: el filtro se recorta al largo maximo del nombre', async () => {
    await listClientsAction({ name: 'a'.repeat(CLIENTS_LIST_LIMITS.nameFilterMaxLength + 50) })
    expect(lastRpcArgs()).toMatchObject({ p_name_pattern: `%${'a'.repeat(CLIENTS_LIST_LIMITS.nameFilterMaxLength)}%` })
  })

  it('criterio 2: filtra por rango de fechas de ultima visita, junto con el nombre', async () => {
    await listClientsAction({ name: 'ana', visitFrom: '2026-04-01', visitTo: '2026-06-30' })
    expect(lastRpcArgs()).toEqual({ p_name_pattern: '%ana%', p_visit_from: '2026-04-01', p_visit_to: '2026-06-30' })
  })

  it('criterio 2: con un solo extremo el rango queda abierto, y una fecha invalida no filtra', async () => {
    await listClientsAction({ visitTo: '2026-06-30' })
    expect(lastRpcArgs()).toMatchObject({ p_visit_from: null, p_visit_to: '2026-06-30' })
    await listClientsAction({ visitFrom: '2026-02-30', visitTo: 'ayer' })
    expect(lastRpcArgs()).toMatchObject({ p_visit_from: null, p_visit_to: null })
  })

  it('criterio 2: un rango al reves no consulta la base y lo dice', async () => {
    const result = await listClientsAction({ visitFrom: '2026-06-30', visitTo: '2026-04-01' })
    expect(mockRpc).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, reason: 'invalid-visit-range', error: CLIENTS_ERROR_MESSAGES.invertedVisitRange })
  })

  it('reporta el fallo de lectura en vez de devolver una lista vacia', async () => {
    dbResult = { data: null, error: { message: 'permission denied for function clients_list' }, count: null }
    expect(await listClientsAction()).toEqual({ ok: false, reason: 'failed', error: CLIENTS_ERROR_MESSAGES.loadFailed })
  })

  it('exige sesion de administradora antes de leer', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT:/admin'))
    await expect(listClientsAction({ page: 1, name: 'ana' })).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRpc).not.toHaveBeenCalled()
  })
})
