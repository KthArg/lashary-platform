import { describe, it, expect, vi } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { loadReview } from '../load-review'
import { ACTIVE_CASES_LIST_LIMIT } from '../../domain/active-case'
import { REVIEW_LIST_LIMIT } from '../../domain/active-client'
import { EXCEPTION_HISTORY_LIST_LIMIT } from '../../domain/delinquency-case'
import type { CaseListRepository, ClientNamesPort } from '../ports'
import type { DelinquencyCase } from '../../domain/delinquency-case'
import { delinquencyStorageFailed } from '../../domain/errors'

const ANA = '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21'
const LUCIA = '3e8f3b2a-7c6d-4a2a-8f74-2f8c5a8b1c43'
const CASO_LUCIA = '4f9a4c3b-8d7e-4b3b-9085-3f9d6b9c2d54'
const CITA_LUCIA = '5a0b5d4c-9e8f-4c4c-a196-4a0e7c0d3e65'

const toReview: DelinquencyCase = {
  id: '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11',
  clientId: ANA,
  appointmentId: '2d7e2a1f-6b5c-4f1f-9e63-1e7b4f7a0b32',
  pending: 20000,
  state: 'pending_review',
  detectedAt: new Date('2026-11-01T15:00:00Z'),
  decidedAt: null,
  exceptionReason: null,
  exceptionAmount: null,
}

const activeLucia = { caseId: CASO_LUCIA, clientId: LUCIA, appointmentId: CITA_LUCIA, pending: 9000, since: new Date('2026-10-20T15:00:00Z') }

const liftedCase: DelinquencyCase = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  clientId: ANA,
  appointmentId: 'a1b2c3d4-0000-4000-8000-000000000002',
  pending: 5000,
  state: 'lifted',
  detectedAt: new Date('2026-10-01T15:00:00Z'),
  decidedAt: new Date('2026-10-05T15:00:00Z'),
  exceptionReason: 'error de registro',
  exceptionAmount: null,
}

const forgivenCase: DelinquencyCase = {
  id: 'a1b2c3d4-0000-4000-8000-000000000003',
  clientId: LUCIA,
  appointmentId: 'a1b2c3d4-0000-4000-8000-000000000004',
  pending: 6000,
  state: 'forgiven',
  detectedAt: new Date('2026-10-02T15:00:00Z'),
  decidedAt: new Date('2026-10-06T15:00:00Z'),
  exceptionReason: 'buena clienta',
  exceptionAmount: 6000,
}

function deps(overrides: Partial<CaseListRepository> = {}, names?: ClientNamesPort) {
  const cases: CaseListRepository = {
    listByState: async (state) => {
      if (state === 'lifted') return ok([liftedCase])
      if (state === 'forgiven') return ok([forgivenCase])
      return ok([toReview])
    },
    listActiveClients: async () => ok([]),
    listActiveCases: async () => ok([activeLucia]),
    ...overrides,
  }
  const namesPort: ClientNamesPort = names ?? {
    namesFor: async () =>
      ok(
        new Map([
          [ANA, 'Ana Pérez'],
          [LUCIA, 'Lucía Mora'],
        ]),
      ),
  }
  return { cases, names: namesPort }
}

describe('loadReview', () => {
  it('arma las morosidades por revisar, las activas por caso y el historial, con el nombre de cada clienta', async () => {
    const result = await loadReview(deps())()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.toReview).toEqual([
      { caseId: toReview.id, clientId: ANA, clientName: 'Ana Pérez', pending: 20000, detectedAt: toReview.detectedAt },
    ])
    expect(result.value.active).toEqual([
      {
        caseId: CASO_LUCIA,
        clientId: LUCIA,
        clientName: 'Lucía Mora',
        appointmentId: CITA_LUCIA,
        pending: 9000,
        since: new Date('2026-10-20T15:00:00Z'),
      },
    ])
    expect(result.value.lifted).toEqual([
      {
        caseId: liftedCase.id,
        clientId: ANA,
        clientName: 'Ana Pérez',
        pending: 5000,
        exceptionReason: 'error de registro',
        exceptionAmount: null,
        decidedAt: liftedCase.decidedAt,
      },
    ])
    expect(result.value.forgiven).toEqual([
      {
        caseId: forgivenCase.id,
        clientId: LUCIA,
        clientName: 'Lucía Mora',
        pending: 6000,
        exceptionReason: 'buena clienta',
        exceptionAmount: 6000,
        decidedAt: forgivenCase.decidedAt,
      },
    ])
  })

  it('pide los nombres una sola vez, con las clientas sin repetir', async () => {
    const namesFor = vi.fn(async () => ok(new Map<string, string>()))
    await loadReview(
      deps(
        {
          listByState: async (state) => (state === 'pending_review' ? ok([toReview]) : ok([])),
          listActiveCases: async () => ok([{ ...activeLucia, clientId: ANA }]),
        },
        { namesFor },
      ),
    )()

    expect(namesFor).toHaveBeenCalledTimes(1)
    expect(namesFor).toHaveBeenCalledWith([ANA])
  })

  it('una clienta sin nombre visible queda con nombre vacío para que la pantalla ponga el suyo', async () => {
    const result = await loadReview(deps({}, { namesFor: async () => ok(new Map()) }))()

    expect(isOk(result) && result.value.toReview[0].clientName).toBeNull()
  })

  it('sin morosidades devuelve las cuatro listas vacías', async () => {
    const result = await loadReview(
      deps({ listByState: async () => ok([]), listActiveCases: async () => ok([]) }),
    )()

    expect(isOk(result) && result.value).toEqual({
      toReview: [],
      active: [],
      lifted: [],
      forgiven: [],
      moreToReview: false,
      moreActive: false,
      moreLifted: false,
      moreForgiven: false,
    })
  })

  it('pide una fila más que el tope y, si llega, avisa que hay más y muestra solo el tope', async () => {
    const manyCases = Array.from({ length: REVIEW_LIST_LIMIT + 1 }, (_, i) => ({ ...toReview, id: `caso-${i}` }))
    const manyActive = Array.from({ length: ACTIVE_CASES_LIST_LIMIT + 1 }, (_, i) => ({ ...activeLucia, caseId: `activa-${i}` }))
    const manyLifted = Array.from({ length: EXCEPTION_HISTORY_LIST_LIMIT + 1 }, (_, i) => ({ ...liftedCase, id: `lifted-${i}` }))
    const manyForgiven = Array.from({ length: EXCEPTION_HISTORY_LIST_LIMIT + 1 }, (_, i) => ({ ...forgivenCase, id: `forgiven-${i}` }))
    const listByState = vi.fn(async (state: string) => {
      if (state === 'lifted') return ok(manyLifted)
      if (state === 'forgiven') return ok(manyForgiven)
      return ok(manyCases)
    })
    const listActiveCases = vi.fn(async () => ok(manyActive))

    const result = await loadReview(deps({ listByState, listActiveCases }))()

    expect(listByState).toHaveBeenCalledWith('pending_review', REVIEW_LIST_LIMIT + 1)
    expect(listByState).toHaveBeenCalledWith('lifted', EXCEPTION_HISTORY_LIST_LIMIT + 1)
    expect(listByState).toHaveBeenCalledWith('forgiven', EXCEPTION_HISTORY_LIST_LIMIT + 1)
    expect(listActiveCases).toHaveBeenCalledWith(ACTIVE_CASES_LIST_LIMIT + 1)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.toReview).toHaveLength(REVIEW_LIST_LIMIT)
    expect(result.value.active).toHaveLength(ACTIVE_CASES_LIST_LIMIT)
    expect(result.value.lifted).toHaveLength(EXCEPTION_HISTORY_LIST_LIMIT)
    expect(result.value.forgiven).toHaveLength(EXCEPTION_HISTORY_LIST_LIMIT)
    expect(result.value.moreToReview).toBe(true)
    expect(result.value.moreActive).toBe(true)
    expect(result.value.moreLifted).toBe(true)
    expect(result.value.moreForgiven).toBe(true)
  })

  it('con exactamente el tope no avisa de más', async () => {
    const exactCases = Array.from({ length: REVIEW_LIST_LIMIT }, (_, i) => ({ ...toReview, id: `caso-${i}` }))

    const result = await loadReview(deps({ listByState: async () => ok(exactCases) }))()

    expect(isOk(result) && result.value.toReview).toHaveLength(REVIEW_LIST_LIMIT)
    expect(isOk(result) && result.value.moreToReview).toBe(false)
    expect(isOk(result) && result.value.moreActive).toBe(false)
  })

  it('si falla la lectura de las morosidades, de las activas o de los nombres, devuelve el error', async () => {
    const failing = () => err(delinquencyStorageFailed('boom'))
    const readFails = await loadReview(deps({ listByState: async () => failing() }))()
    const activeFails = await loadReview(deps({ listActiveCases: async () => failing() }))()
    const namesFail = await loadReview(deps({}, { namesFor: async () => failing() }))()

    expect(isErr(readFails)).toBe(true)
    expect(isErr(activeFails)).toBe(true)
    expect(isErr(namesFail)).toBe(true)
  })
})
