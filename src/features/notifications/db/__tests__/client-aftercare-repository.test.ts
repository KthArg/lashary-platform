import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isAftercareStorageFailed } from '../../domain/errors'
import { MY_AFTERCARE_PAGE_SIZE } from '../../domain/aftercare-message'
import { clientAftercareRepository, CLIENT_AFTERCARE_COLUMNS, AFTERCARE_MESSAGES_TABLE } from '../client-aftercare-repository'

const PRIVATE_COLUMNS = ['client_id', 'status', 'attempts', 'last_error', 'claimed_at', 'last_channel', 'sent_at']

const row = {
  id: 'indicacion-1',
  appointment_id: 'cita-1',
  service_name: 'Lifting de pestañas',
  aftercare_text: 'No mojes las pestañas por 24 horas.\nEvita el vapor.',
  client_note: 'Vuelve en tres semanas.',
  created_at: '2047-10-01T18:00:00+00:00',
}

type FakeResponse = { data?: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: FakeResponse) => unknown) => resolve(response) }
  for (const method of ['select', 'order', 'limit']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  return { db, calls }
}

describe('clientAftercareRepository', () => {
  it('lee las indicaciones más recientes primero, con tope en la consulta (PERF-002)', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })

    const result = await clientAftercareRepository(db).listRecent(MY_AFTERCARE_PAGE_SIZE)

    expect(calls).toEqual([
      ['from', AFTERCARE_MESSAGES_TABLE],
      ['select', CLIENT_AFTERCARE_COLUMNS],
      ['order', 'created_at', { ascending: false }],
      ['order', 'id', { ascending: false }],
      ['limit', MY_AFTERCARE_PAGE_SIZE],
    ])
    expect(isOk(result) && result.value).toEqual([
      {
        id: 'indicacion-1',
        appointmentId: 'cita-1',
        serviceName: 'Lifting de pestañas',
        aftercareText: row.aftercare_text,
        clientNote: 'Vuelve en tres semanas.',
        createdAt: new Date('2047-10-01T18:00:00Z'),
      },
    ])
  })

  it('pide solo las columnas que la clienta puede leer, ninguna interna', () => {
    const requested = CLIENT_AFTERCARE_COLUMNS.split(', ')
    for (const privateColumn of PRIVATE_COLUMNS) expect(requested).not.toContain(privateColumn)
  })

  it('una indicación sin nota llega con la nota en null', async () => {
    const { db } = createFakeDb({ data: [{ ...row, client_note: null }], error: null })
    const result = await clientAftercareRepository(db).listRecent(MY_AFTERCARE_PAGE_SIZE)
    expect(isOk(result) && result.value[0].clientNote).toBeNull()
  })

  it('un fallo de la base es un error, nunca una lista vacía, y no guarda el texto crudo de la base', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'sin conexión a 10.0.0.5' } })
    const result = await clientAftercareRepository(db).listRecent(MY_AFTERCARE_PAGE_SIZE)
    expect(isErr(result) && isAftercareStorageFailed(result.error)).toBe(true)
    expect(isErr(result) && JSON.stringify(result.error)).not.toContain('10.0.0.5')
  })

  it('una fila con otra forma es un error, no una indicación a medias', async () => {
    const { db } = createFakeDb({ data: [{ ...row, aftercare_text: null }], error: null })
    const result = await clientAftercareRepository(db).listRecent(MY_AFTERCARE_PAGE_SIZE)
    expect(isErr(result) && isAftercareStorageFailed(result.error)).toBe(true)
  })
})
