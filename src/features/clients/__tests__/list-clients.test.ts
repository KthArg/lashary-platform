import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * US-CLI-05 criterio 2 — la lista sale de la base, no de un arreglo quemado.
 * Se mockea el cliente de Supabase: lo que se prueba aqui es la traduccion fila -> ClientRecord y
 * que un fallo de la base se convierta en estado de error (UI-003), no la politica RLS, que es
 * cosa de Postgres y no de vitest.
 */
const limit = vi.fn()
const createClient = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () => createClient(),
}))

const supabaseReturning = (result: unknown) => {
  limit.mockResolvedValue(result)
  createClient.mockResolvedValue({
    from: () => ({ select: () => ({ order: () => ({ limit }) }) }),
  })
}

const { listClients } = await import('../actions/list-clients')
const { CLIENTS_ERROR_MESSAGES } = await import('../constants/clients-strings')
const { CLIENTS_LIST_LIMIT } = await import('../constants/clients-query')

beforeEach(() => {
  limit.mockReset()
  createClient.mockReset()
})

describe('listClients', () => {
  it('traduce la fila de la base al registro que consume el formulario', async () => {
    supabaseReturning({
      data: [{ id: 'a1', full_name: 'María Fernández Rojas', phone: '+506 8888 1234', email: 'maria@correo.com', notes: 'Prefiere la tarde.' }],
      error: null,
    })

    const result = await listClients()

    expect(result).toEqual({
      ok: true,
      clients: [{ id: 'a1', fullName: 'María Fernández Rojas', phone: '+506 8888 1234', email: 'maria@correo.com', notes: 'Prefiere la tarde.' }],
    })
  })

  it('convierte notes nula en texto vacio: el formulario espera un string, no null', async () => {
    supabaseReturning({ data: [{ id: 'a1', full_name: 'Ana', phone: '+506 7012 5566', email: 'ana@correo.com', notes: null }], error: null })

    const result = await listClients()

    expect(result.ok && result.clients[0].notes).toBe('')
  })

  it('devuelve la lista vacia sin error cuando la base no trae filas', async () => {
    supabaseReturning({ data: [], error: null })

    expect(await listClients()).toEqual({ ok: true, clients: [] })
  })

  it('convierte el fallo de la base en estado de error, no en lista vacia (UI-003)', async () => {
    supabaseReturning({ data: null, error: { message: 'connection refused' } })

    expect(await listClients()).toEqual({ ok: false, error: CLIENTS_ERROR_MESSAGES.clientsListLoadFailed })
  })

  it('pide la lectura con tope: ningun listado sale sin limite (PERF-002)', async () => {
    supabaseReturning({ data: [], error: null })

    await listClients()

    expect(limit).toHaveBeenCalledWith(CLIENTS_LIST_LIMIT)
  })
})
