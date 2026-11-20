import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listClientsAction } from '../../ui/admin-clients/actions/client-actions'
import { CLIENTS_ERROR_MESSAGES, CLIENTS_LIST_LIMITS, DELINQUENCY_FILTER_VALUES } from '@/features/clients'

let dbResult: { data: unknown; error: unknown; count: number | null }
let statesResult: { data: unknown; error: unknown }
const mockRpc = vi.fn()
const mockOrder = vi.fn()
const mockRange = vi.fn()
const chain = {
  order: (...args: unknown[]) => { mockOrder(...args); return chain },
  range: async (...args: unknown[]) => { mockRange(...args); return dbResult },
}
const mockRequireAdmin = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    rpc: (...args: unknown[]) => {
      mockRpc(...args)
      // La morosidad es de otra feature y se pide aparte: aquí responde que nadie debe nada.
      return args[0] === 'delinquency_client_states' ? Promise.resolve(statesResult) : chain
    },
  })),
}))
vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const LAST_APPOINTMENT_AT = '2026-06-30T23:30:00-06:00'
const row = {
  id: 'c-1', full_name: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: null,
  created_at: '2026-01-10T15:00:00+00:00', last_appointment_at: LAST_APPOINTMENT_AT,
}
const neverBookedRow = { ...row, id: 'c-2', full_name: 'Bea Mora', last_appointment_at: null }
const { defaultPageSize, pageSizes } = CLIENTS_LIST_LIMITS

// Después de listar, `clients` pide la morosidad por otra función: aquí interesa solo la llamada del listado.
const lastRpcArgs = () => mockRpc.mock.calls.findLast((call) => call[0] === 'clients_list')?.[1]

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ role: 'admin' })
  dbResult = { data: [row], error: null, count: 31 }
  statesResult = { data: [], error: null }
})

describe('listClientsAction', () => {
  it('sin parametros lee la primera pagina por defecto, las mas recientes primero y con el total', async () => {
    const result = await listClientsAction()
    expect(mockRpc).toHaveBeenCalledWith(
      'clients_list',
      { p_name_pattern: null, p_appointment_from: null, p_appointment_to: null, p_delinquency: null },
      { count: 'exact' },
    )
    expect(mockOrder.mock.calls).toEqual([['created_at', { ascending: false }], ['id']])
    expect(mockRange).toHaveBeenCalledWith(0, defaultPageSize - 1)
    expect(result).toEqual({
      ok: true, total: 31, page: 0, pageSize: defaultPageSize,
      clients: [{
        id: 'c-1', fullName: 'Ana Solís', phone: '+50688887777', email: 'ana@correo.com', notes: '',
        lastAppointmentAtMs: Date.parse(LAST_APPOINTMENT_AT),
      }],
      delinquency: {}, delinquencyAvailable: true,
    })
  })

  it('criterio 1: una clienta que nunca agendo llega sin ultima cita, no con una fecha inventada', async () => {
    dbResult = { data: [neverBookedRow], error: null, count: 1 }
    const result = await listClientsAction()
    expect(result).toMatchObject({ ok: true, clients: [{ id: 'c-2', lastAppointmentAtMs: null }] })
  })

  it('una ultima cita que no se puede leer es un fallo de lectura, no una fecha invalida en pantalla', async () => {
    dbResult = { data: [{ ...row, last_appointment_at: 'no-es-una-fecha' }], error: null, count: 1 }
    expect(await listClientsAction()).toEqual({ ok: false, reason: 'failed', error: CLIENTS_ERROR_MESSAGES.loadFailed })
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

  it('criterio 2: filtra por rango de fechas de ultima cita, junto con el nombre', async () => {
    await listClientsAction({ name: 'ana', appointmentFrom: '2026-04-01', appointmentTo: '2026-06-30' })
    expect(lastRpcArgs()).toEqual({ p_name_pattern: '%ana%', p_appointment_from: '2026-04-01', p_appointment_to: '2026-06-30', p_delinquency: null })
  })

  it('criterio 2: con un solo extremo el rango queda abierto, y una fecha invalida no filtra', async () => {
    await listClientsAction({ appointmentTo: '2026-06-30' })
    expect(lastRpcArgs()).toMatchObject({ p_appointment_from: null, p_appointment_to: '2026-06-30' })
    await listClientsAction({ appointmentFrom: '2026-02-30', appointmentTo: 'ayer' })
    expect(lastRpcArgs()).toMatchObject({ p_appointment_from: null, p_appointment_to: null })
  })

  it('criterio 2: un rango al reves no consulta la base y lo dice', async () => {
    const result = await listClientsAction({ appointmentFrom: '2026-06-30', appointmentTo: '2026-04-01' })
    expect(mockRpc).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, reason: 'invalid-appointment-range', error: CLIENTS_ERROR_MESSAGES.invertedAppointmentRange })
  })

  it('el filtro de morosidad pasa a la consulta con cada uno de sus valores', async () => {
    for (const delinquency of DELINQUENCY_FILTER_VALUES) {
      await listClientsAction({ delinquency })
      expect(lastRpcArgs()).toMatchObject({ p_delinquency: delinquency })
    }
  })

  it('sin filtro de morosidad la consulta lo manda nulo', async () => {
    await listClientsAction({})
    expect(lastRpcArgs()).toMatchObject({ p_delinquency: null })
  })

  it('un filtro de morosidad desconocido o que no es texto no filtra, y no llega a la base', async () => {
    for (const delinquency of ['dismissed', '', 'ACTIVE', 'todas', 7, null]) {
      await listClientsAction({ delinquency: delinquency as string })
      expect(lastRpcArgs()).toMatchObject({ p_delinquency: null })
    }
  })

  it('el filtro de morosidad viaja junto con el nombre y el rango de fechas', async () => {
    await listClientsAction({
      name: 'ana', appointmentFrom: '2026-04-01', appointmentTo: '2026-06-30', delinquency: DELINQUENCY_FILTER_VALUES[0],
    })
    expect(lastRpcArgs()).toEqual({
      p_name_pattern: '%ana%',
      p_appointment_from: '2026-04-01',
      p_appointment_to: '2026-06-30',
      p_delinquency: DELINQUENCY_FILTER_VALUES[0],
    })
  })

  it('un rango al reves no consulta la base aunque venga con filtro de morosidad', async () => {
    const result = await listClientsAction({
      appointmentFrom: '2026-06-30', appointmentTo: '2026-04-01', delinquency: DELINQUENCY_FILTER_VALUES[1],
    })
    expect(mockRpc).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: false, reason: 'invalid-appointment-range' })
  })

  it('criterio 4: con filtro de morosidad, si la morosidad no se puede leer es un fallo de lectura y no una lista con «Sin dato»', async () => {
    statesResult = { data: null, error: { message: 'delinquency caida' } }
    expect(await listClientsAction({ delinquency: DELINQUENCY_FILTER_VALUES[0] }))
      .toEqual({ ok: false, reason: 'failed', error: CLIENTS_ERROR_MESSAGES.loadFailed })
  })

  it('criterio 4: sin filtro de morosidad, una morosidad caida no tumba el listado', async () => {
    statesResult = { data: null, error: { message: 'delinquency caida' } }
    expect(await listClientsAction({})).toMatchObject({ ok: true, delinquencyAvailable: false })
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
