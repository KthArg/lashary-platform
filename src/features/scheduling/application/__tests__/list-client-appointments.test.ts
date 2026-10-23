import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { storageFailed } from '../../domain/errors'
import {
  CLIENT_APPOINTMENTS_DEFAULT_PAGE_SIZE,
  CLIENT_APPOINTMENTS_MAX_PAGE_SIZE,
  listClientAppointments,
} from '../list-client-appointments'
import type {
  ClientAppointmentView,
  ClientAppointmentsRepository,
  ClientAppointmentsSlice,
} from '../client-appointments-ports'

const CLIENT_ID = 'perfil-ana'

const completedAppointment: ClientAppointmentView = {
  id: 'cita-1',
  startsAtMs: Date.parse('2026-09-15T16:00:00Z'),
  status: 'completed',
  techniqueName: 'Clásicas',
  depositRequired: 10000,
  depositRegistered: 10000,
}

function createFakeClientAppointmentsRepository(
  result: Awaited<ReturnType<ClientAppointmentsRepository['listByClient']>>,
) {
  const received: ClientAppointmentsSlice[] = []
  const repository: ClientAppointmentsRepository = {
    async listByClient(slice) {
      received.push(slice)
      return result
    },
  }
  return { repository, received }
}

describe('listClientAppointments', () => {
  it('pide la página de la clienta y devuelve sus citas con el total, la página y el tamaño', async () => {
    const { repository, received } = createFakeClientAppointmentsRepository(
      ok({ items: [completedAppointment], total: 31 }),
    )
    const result = await listClientAppointments(repository)({ clientId: CLIENT_ID, page: 1, pageSize: 10 })

    expect(received).toEqual([{ clientId: CLIENT_ID, offset: 10, limit: 10 }])
    expect(isOk(result) && result.value).toEqual({
      items: [completedAppointment],
      total: 31,
      page: 1,
      pageSize: 10,
    })
  })

  it('sin página ni tamaño lee la primera página con el tamaño por defecto', async () => {
    const { repository, received } = createFakeClientAppointmentsRepository(ok({ items: [], total: 0 }))
    const result = await listClientAppointments(repository)({ clientId: CLIENT_ID })

    expect(received).toEqual([{ clientId: CLIENT_ID, offset: 0, limit: CLIENT_APPOINTMENTS_DEFAULT_PAGE_SIZE }])
    expect(isOk(result) && result.value).toEqual({
      items: [],
      total: 0,
      page: 0,
      pageSize: CLIENT_APPOINTMENTS_DEFAULT_PAGE_SIZE,
    })
  })

  it.each([-1, 1.5, Number.NaN])('una página inválida (%s) se lee como la primera', async (invalidPage) => {
    const { repository, received } = createFakeClientAppointmentsRepository(ok({ items: [], total: 0 }))
    await listClientAppointments(repository)({ clientId: CLIENT_ID, page: invalidPage, pageSize: 10 })

    expect(received[0].offset).toBe(0)
  })

  it.each([0, -5, 2.5, Number.NaN])('un tamaño inválido (%s) usa el tamaño por defecto', async (invalidPageSize) => {
    const { repository, received } = createFakeClientAppointmentsRepository(ok({ items: [], total: 0 }))
    await listClientAppointments(repository)({ clientId: CLIENT_ID, pageSize: invalidPageSize })

    expect(received[0].limit).toBe(CLIENT_APPOINTMENTS_DEFAULT_PAGE_SIZE)
  })

  it('un tamaño mayor que el máximo se recorta al máximo', async () => {
    const { repository, received } = createFakeClientAppointmentsRepository(ok({ items: [], total: 0 }))
    const result = await listClientAppointments(repository)({
      clientId: CLIENT_ID,
      pageSize: CLIENT_APPOINTMENTS_MAX_PAGE_SIZE + 1,
    })

    expect(received[0].limit).toBe(CLIENT_APPOINTMENTS_MAX_PAGE_SIZE)
    expect(isOk(result) && result.value.pageSize).toBe(CLIENT_APPOINTMENTS_MAX_PAGE_SIZE)
  })

  it('un fallo de la base llega como StorageFailed, no como un historial vacío', async () => {
    const failure = storageFailed('connection refused')
    const { repository } = createFakeClientAppointmentsRepository(err(failure))
    const result = await listClientAppointments(repository)({ clientId: CLIENT_ID })

    expect(isErr(result) && result.error).toEqual(failure)
  })
})
