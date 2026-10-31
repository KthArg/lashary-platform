import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabasePendingAppointmentsRepository } from '../pending-appointments-repository'
import {
  APPOINTMENTS_TABLE,
  CLIENT_NAMES_FUNCTION,
  PENDING_APPOINTMENT_COLUMNS,
  PENDING_APPOINTMENTS_LIMIT,
} from '../appointment-repository.constants'

const baseRow = {
  id: 'cita-1',
  client_id: 'perfil-ana',
  starts_at: '2027-03-01T16:00:00+00:00',
  ends_at: '2027-03-01T17:00:00+00:00',
}
const chosenRow = {
  ...baseRow,
  technique_name: 'Clásicas',
  package_name: null,
  is_first_time: false,
  is_first_time_detected: true,
  service_price: 25000,
  deposit_required: 10000,
}
const packageRow = {
  ...baseRow,
  technique_name: null,
  package_name: 'Combo clásicas',
  is_first_time: null,
  is_first_time_detected: null,
  service_price: 45000,
  deposit_required: 12000,
}
const staffRow = {
  ...baseRow,
  client_id: null,
  technique_name: null,
  package_name: null,
  is_first_time: null,
  is_first_time_detected: null,
  service_price: null,
  deposit_required: null,
}

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse, namesResponse: FakeResponse = { data: [], error: null }) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (columns: string) => (calls.push(['select', columns]), query),
    eq: (column: string, value: unknown) => (calls.push(['eq', column, value]), query),
    order: (column: string, options: unknown) => (calls.push(['order', column, options]), query),
    limit: async (count: number) => (calls.push(['limit', count]), response),
  }
  const db = {
    from: (table: string) => (calls.push(['from', table]), query),
    rpc: async (name: string, args: unknown) => (calls.push(['rpc', name, args]), namesResponse),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabasePendingAppointmentsRepository', () => {
  it('pide la elección de la clienta junto con el horario, solo las pendientes y las más próximas primero y con tope', async () => {
    const { db, calls } = createFakeDb(
      { data: [chosenRow], error: null },
      { data: [{ client_id: 'perfil-ana', full_name: 'Ana Mora' }], error: null },
    )
    const result = await createSupabasePendingAppointmentsRepository(db).listPending()

    expect(calls).toEqual([
      ['from', APPOINTMENTS_TABLE],
      ['select', PENDING_APPOINTMENT_COLUMNS],
      ['eq', 'status', 'pending_approval'],
      ['order', 'starts_at', { ascending: true }],
      ['limit', PENDING_APPOINTMENTS_LIMIT],
      ['rpc', CLIENT_NAMES_FUNCTION, { p_client_ids: ['perfil-ana'] }],
    ])
    expect(isOk(result) && result.value).toEqual([
      {
        id: 'cita-1',
        startsAtMs: Date.parse('2027-03-01T16:00:00Z'),
        endsAtMs: Date.parse('2027-03-01T17:00:00Z'),
        clientName: 'Ana Mora',
        choice: {
          techniqueName: 'Clásicas',
          isFirstTime: false,
          detectedFirstTime: true,
          servicePrice: 25000,
          depositRequired: 10000,
        },
      },
    ])
  })

  it('una cita de paquete llega con el nombre del paquete y sin primera vez/retoque', async () => {
    const { db } = createFakeDb(
      { data: [packageRow], error: null },
      { data: [{ client_id: 'perfil-ana', full_name: 'Ana Mora' }], error: null },
    )
    const result = await createSupabasePendingAppointmentsRepository(db).listPending()

    expect(isOk(result) && result.value[0].choice).toEqual({
      techniqueName: 'Combo clásicas',
      isFirstTime: null,
      detectedFirstTime: null,
      servicePrice: 45000,
      depositRequired: 12000,
    })
  })

  it('una cita creada por el personal, sin elección guardada, llega con choice nulo', async () => {
    const { db } = createFakeDb({ data: [staffRow], error: null })
    const result = await createSupabasePendingAppointmentsRepository(db).listPending()

    expect(isOk(result) && result.value[0].choice).toBeNull()
  })

  it('pide los nombres por el contrato de clients en una sola llamada, sin repetir clientas', async () => {
    const { db, calls } = createFakeDb(
      { data: [chosenRow, { ...chosenRow, id: 'cita-2' }, { ...chosenRow, id: 'cita-3', client_id: 'perfil-eva' }], error: null },
      {
        data: [
          { client_id: 'perfil-ana', full_name: 'Ana Mora' },
          { client_id: 'perfil-eva', full_name: 'Eva Soto' },
        ],
        error: null,
      },
    )
    const result = await createSupabasePendingAppointmentsRepository(db).listPending()

    expect(calls.filter(([kind]) => kind === 'rpc')).toEqual([
      ['rpc', CLIENT_NAMES_FUNCTION, { p_client_ids: ['perfil-ana', 'perfil-eva'] }],
    ])
    expect(isOk(result) && result.value.map((appointment) => appointment.clientName)).toEqual([
      'Ana Mora',
      'Ana Mora',
      'Eva Soto',
    ])
  })

  it('sin ninguna cita con clienta no llama al contrato y el nombre queda nulo', async () => {
    const { db, calls } = createFakeDb({ data: [staffRow], error: null })
    const result = await createSupabasePendingAppointmentsRepository(db).listPending()

    expect(calls.some(([kind]) => kind === 'rpc')).toBe(false)
    expect(isOk(result) && result.value[0].clientName).toBeNull()
  })

  it('si el contrato de clients falla es StorageFailed: la cola no se muestra a ciegas', async () => {
    const { db } = createFakeDb(
      { data: [chosenRow], error: null },
      { data: null, error: { message: 'permission denied' } },
    )
    const result = await createSupabasePendingAppointmentsRepository(db).listPending()

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })

  it('un fallo de la base es StorageFailed', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'connection refused' } })
    const result = await createSupabasePendingAppointmentsRepository(db).listPending()

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
