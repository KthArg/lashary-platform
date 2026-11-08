import { describe, it, expect, vi, beforeEach } from 'vitest'
import { err, ok } from '@/shared/result'
import { readAppointmentHistory } from '../queries/history-queries'
import { HISTORY_ERROR_MESSAGES } from '../constants/history-strings'
import { savedNote } from '@/features/clients/application/__tests__/note-fakes'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const MISSING_ID = '99999999-9999-4999-8999-999999999999'
const FAILING_ID = '88888888-8888-4888-8888-888888888888'
const STARTS_AT_MS = Date.parse('2026-09-15T16:00:00Z')
const HISTORY_UNAVAILABLE = { ok: false, error: HISTORY_ERROR_MESSAGES.historyUnavailable }

const mocks = vi.hoisted(() => ({ requireAdminSession: vi.fn(), historySource: vi.fn(), listForAppointments: vi.fn() }))

vi.mock('@/features/clients/db/notes/note-repository', () => ({
  noteRepository: async () => ({ listForAppointments: mocks.listForAppointments }),
}))

vi.mock('@/features/auth', () => ({ requireAdminSession: mocks.requireAdminSession }))
vi.mock('@/features/clients/db/client-repository', () => ({
  clientRepository: async () => ({
    findById: async (id: string) => (id === FAILING_ID ? err('repository-failed') : ok(id === CLIENT_ID ? { id } : null)),
  }),
}))
vi.mock('@/features/clients/http/history/history-gateways', () => ({
  schedulingAppointmentHistory: (query: unknown) => mocks.historySource(query),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdminSession.mockResolvedValue({ user: { id: 'admin-1' }, role: 'admin' })
  mocks.historySource.mockResolvedValue(
    ok({
      records: [{ id: 'cita-1', startsAtMs: STARTS_AT_MS, status: 'completed', serviceName: 'Clásicas', depositRequired: 10000, depositRegistered: 0 }],
      total: 1,
      page: 0,
      pageSize: 25,
    }),
  )
  mocks.listForAppointments.mockResolvedValue(ok([]))
})

describe('readAppointmentHistory — la lectura del historial para la pestaña Citas', () => {
  it('devuelve las citas de la clienta con el estado de su anticipo, la página y el total', async () => {
    const result = await readAppointmentHistory(CLIENT_ID, 0)

    expect(mocks.historySource).toHaveBeenCalledWith({ clientId: CLIENT_ID, page: 0 })
    expect(result).toEqual({
      ok: true,
      entries: [{ id: 'cita-1', startsAtMs: STARTS_AT_MS, status: 'completed', serviceName: 'Clásicas', depositStatus: 'pending', notes: [] }],
      total: 1,
      page: 0,
      pageSize: 25,
    })
  })

  it('pide las anotaciones de toda la página en una sola llamada y las pone en su cita (criterio 2)', async () => {
    mocks.listForAppointments.mockResolvedValue(ok([savedNote({ appointmentId: 'cita-1', body: 'Ojos irritados' })]))
    const result = await readAppointmentHistory(CLIENT_ID, 0)
    expect(mocks.listForAppointments).toHaveBeenCalledTimes(1)
    expect(mocks.listForAppointments).toHaveBeenCalledWith(CLIENT_ID, ['cita-1'])
    expect(result.ok && result.entries[0].notes.map((note) => note.body)).toEqual(['Ojos irritados'])
  })

  it('si las anotaciones no se pueden leer, muestra el aviso y no citas sin anotaciones', async () => {
    mocks.listForAppointments.mockResolvedValue(err('storage-failed'))
    expect(await readAppointmentHistory(CLIENT_ID)).toEqual(HISTORY_UNAVAILABLE)
  })

  it.each([
    ['una clienta que no existe', MISSING_ID],
    ['un id mal formado', '../otra'],
  ])('%s es no encontrada y no se piden sus citas', async (_caseName, clientId) => {
    expect(await readAppointmentHistory(clientId)).toMatchObject({ ok: false, notFound: true })
    expect(mocks.historySource).not.toHaveBeenCalled()
  })

  it('si no se puede leer a la clienta, el historial no está disponible', async () => {
    expect(await readAppointmentHistory(FAILING_ID)).toEqual(HISTORY_UNAVAILABLE)
  })

  it('si las citas no se pueden leer, muestra el aviso y no un historial vacío', async () => {
    mocks.historySource.mockResolvedValue(err('history-unavailable'))
    expect(await readAppointmentHistory(CLIENT_ID)).toEqual(HISTORY_UNAVAILABLE)
  })

  it('sin sesión de administradora no lee nada', async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error('NEXT_REDIRECT'))
    await expect(readAppointmentHistory(CLIENT_ID)).rejects.toThrow('NEXT_REDIRECT')
    expect(mocks.historySource).not.toHaveBeenCalled()
  })
})
