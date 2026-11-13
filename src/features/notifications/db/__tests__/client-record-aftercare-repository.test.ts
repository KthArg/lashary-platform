import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isAftercareStorageFailed } from '../../domain/errors'
import { CLIENT_RECORD_AFTERCARE_PAGE_SIZE } from '../../domain/aftercare-message'
import { AFTERCARE_MESSAGES_TABLE } from '../client-aftercare-repository'
import { clientRecordAftercareRepository, CLIENT_RECORD_AFTERCARE_COLUMNS } from '../client-record-aftercare-repository'

const CLIENT_ID = '3f2b8c1e-5d4a-4e7b-9a10-2c6d8e0f1a23'
const INTERNAL_COLUMNS = ['attempts', 'last_error', 'claimed_at']

const row = {
  id: 'indicacion-1',
  appointment_id: 'cita-1',
  service_name: 'Lifting de pestañas',
  aftercare_text: 'No mojes las pestañas por 24 horas.',
  client_note: 'Vuelve en tres semanas.',
  status: 'sent',
  last_channel: 'whatsapp',
  created_at: '2047-10-01T18:00:00+00:00',
}

type FakeResponse = { data?: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: FakeResponse) => unknown) => resolve(response) }
  for (const method of ['select', 'eq', 'order', 'limit']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  return { db, calls }
}

const listWith = (response: FakeResponse) => clientRecordAftercareRepository(createFakeDb(response).db).listForClient(CLIENT_ID, CLIENT_RECORD_AFTERCARE_PAGE_SIZE)

describe('clientRecordAftercareRepository', () => {
  it('filtra por la clienta de la URL, ordena las más recientes primero y topa la consulta (PERF-002)', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })

    const result = await clientRecordAftercareRepository(db).listForClient(CLIENT_ID, CLIENT_RECORD_AFTERCARE_PAGE_SIZE)

    expect(calls).toEqual([
      ['from', AFTERCARE_MESSAGES_TABLE],
      ['select', CLIENT_RECORD_AFTERCARE_COLUMNS],
      ['eq', 'client_id', CLIENT_ID],
      ['order', 'created_at', { ascending: false }],
      ['order', 'id', { ascending: false }],
      ['limit', CLIENT_RECORD_AFTERCARE_PAGE_SIZE],
    ])
    expect(isOk(result) && result.value).toEqual([
      {
        id: 'indicacion-1',
        appointmentId: 'cita-1',
        serviceName: 'Lifting de pestañas',
        aftercareText: row.aftercare_text,
        clientNote: 'Vuelve en tres semanas.',
        deliveryState: 'sentWhatsapp',
        createdAt: new Date('2047-10-01T18:00:00Z'),
      },
    ])
  })

  it('pide el estado del envío y ninguna columna interna', () => {
    const requested = CLIENT_RECORD_AFTERCARE_COLUMNS.split(', ')
    for (const column of ['status', 'last_channel']) expect(requested).toContain(column)
    for (const column of INTERNAL_COLUMNS) expect(requested).not.toContain(column)
  })

  it('traduce el estado y el canal al estado del envío', async () => {
    const cases = [
      { status: 'sent', last_channel: 'email', expected: 'sentEmail' },
      { status: 'sent', last_channel: null, expected: 'sent' },
      { status: 'claimed', last_channel: null, expected: 'pending' },
      { status: 'failed', last_channel: 'email', expected: 'failed' },
    ]
    for (const { expected, ...fields } of cases) {
      const result = await listWith({ data: [{ ...row, ...fields }], error: null })
      expect(isOk(result) && result.value[0].deliveryState).toBe(expected)
    }
  })

  it('una fila con otra forma es un error, no una indicación a medias', async () => {
    const result = await listWith({ data: [{ ...row, status: 'desconocido' }], error: null })
    expect(isErr(result) && isAftercareStorageFailed(result.error)).toBe(true)
  })

  it('un fallo de la base es un error, nunca una lista vacía, y no guarda el texto crudo de la base', async () => {
    const result = await listWith({ data: null, error: { message: 'sin conexión a 10.0.0.5' } })
    expect(isErr(result) && isAftercareStorageFailed(result.error)).toBe(true)
    expect(isErr(result) && JSON.stringify(result.error)).not.toContain('10.0.0.5')
  })
})
