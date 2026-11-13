import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import {
  APPOINTMENTS_TABLE,
  BOOKING_BLOCK_FUNCTION,
  CURRENT_PROFILE_FUNCTION,
  createSupabaseDelinquencyPort,
} from '../delinquency-block-repository'

const CLIENT_ID = '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21'
const APPOINTMENT_ID = '2d7e2a1f-6b5c-4f1f-9e63-1e7b4f7a0b32'
const STARTS_AT = '2026-11-05T15:00:00+00:00'

type Response = { data: unknown; error: { message: string } | null }

function createFakeDb(responses: { profile?: Response; block?: Response; appointment?: Response }) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = {}
  query.select = (...args: unknown[]) => (calls.push(['select', ...args]), query)
  query.eq = (...args: unknown[]) => (calls.push(['eq', ...args]), query)
  query.maybeSingle = async () => responses.appointment ?? { data: null, error: null }
  const db = {
    rpc: async (name: string, args?: unknown) => {
      calls.push(['rpc', name, args])
      return (name === CURRENT_PROFILE_FUNCTION ? responses.profile : responses.block) ?? { data: null, error: null }
    },
    from: (table: string) => (calls.push(['from', table]), query),
  } as unknown as SupabaseClient
  return { db, calls }
}

const profile: Response = { data: CLIENT_ID, error: null }
const oneBlock: Response = { data: [{ appointment_id: APPOINTMENT_ID, pending: 25000, since: '2026-11-01T10:00:00+00:00' }], error: null }

describe('createSupabaseDelinquencyPort.activeBlock', () => {
  it('pregunta por la clienta de la sesión y devuelve el monto de hoy y la fecha de la cita', async () => {
    const { db, calls } = createFakeDb({ profile, block: oneBlock, appointment: { data: { starts_at: STARTS_AT }, error: null } })

    const result = await createSupabaseDelinquencyPort(db).activeBlock()

    expect(calls).toEqual([
      ['rpc', CURRENT_PROFILE_FUNCTION, undefined],
      ['rpc', BOOKING_BLOCK_FUNCTION, { p_client_id: CLIENT_ID }],
      ['from', APPOINTMENTS_TABLE],
      ['select', 'starts_at'],
      ['eq', 'id', APPOINTMENT_ID],
    ])
    expect(isOk(result) && result.value).toEqual({
      appointmentId: APPOINTMENT_ID,
      pending: 25000,
      appointmentStartsAtMs: Date.parse(STARTS_AT),
    })
  })

  it('sin morosidad que bloquee devuelve null y no busca ninguna cita', async () => {
    const { db, calls } = createFakeDb({ profile, block: { data: [], error: null } })

    const result = await createSupabaseDelinquencyPort(db).activeBlock()

    expect(isOk(result) && result.value).toBeNull()
    expect(calls.some((call) => call[0] === 'from')).toBe(false)
  })

  it('sin perfil de clienta devuelve null sin consultar la morosidad', async () => {
    const { db, calls } = createFakeDb({ profile: { data: null, error: null } })

    const result = await createSupabaseDelinquencyPort(db).activeBlock()

    expect(isOk(result) && result.value).toBeNull()
    expect(calls).toEqual([['rpc', CURRENT_PROFILE_FUNCTION, undefined]])
  })

  it('acepta cualquier uuid de la base, no solo los versión 4', async () => {
    const odd = '00000000-0000-0000-0000-00000000ee01'
    const { db } = createFakeDb({
      profile: { data: odd, error: null },
      block: { data: [{ appointment_id: odd, pending: 25000, since: '2026-11-01T10:00:00+00:00' }], error: null },
    })

    const result = await createSupabaseDelinquencyPort(db).activeBlock()

    expect(isOk(result) && result.value?.appointmentId).toBe(odd)
  })

  it('si no se puede leer la fecha de la cita, devuelve el bloqueo sin fecha', async () => {
    const { db } = createFakeDb({ profile, block: oneBlock, appointment: { data: null, error: { message: 'caída' } } })

    const result = await createSupabaseDelinquencyPort(db).activeBlock()

    expect(isOk(result) && result.value).toEqual({
      appointmentId: APPOINTMENT_ID,
      pending: 25000,
      appointmentStartsAtMs: null,
    })
  })

  it.each([
    ['perfil', { profile: { data: null, error: { message: 'caída' } } }],
    ['bloqueo', { profile, block: { data: null, error: { message: 'caída' } } }],
    ['perfil con forma inesperada', { profile: { data: 7, error: null } }],
    ['bloqueo con forma inesperada', { profile, block: { data: [{ appointment_id: 'no-uuid', pending: 1, since: 'x' }], error: null } }],
  ])('un fallo al leer el %s es un fallo de almacenamiento, no una clienta libre', async (_name, responses) => {
    const { db } = createFakeDb(responses)

    const result = await createSupabaseDelinquencyPort(db).activeBlock()

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
