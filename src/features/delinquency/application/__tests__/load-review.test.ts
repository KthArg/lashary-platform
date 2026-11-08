import { describe, it, expect, vi } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { loadReview } from '../load-review'
import type { CaseListRepository, ClientNamesPort } from '../ports'
import type { DelinquencyCase } from '../../domain/delinquency-case'
import { delinquencyStorageFailed } from '../../domain/errors'

const ANA = '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21'
const LUCIA = '3e8f3b2a-7c6d-4a2a-8f74-2f8c5a8b1c43'

const toReview: DelinquencyCase = {
  id: '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11',
  clientId: ANA,
  appointmentId: '2d7e2a1f-6b5c-4f1f-9e63-1e7b4f7a0b32',
  pending: 20000,
  state: 'pending_review',
  detectedAt: new Date('2026-11-01T15:00:00Z'),
  decidedAt: null,
}

function deps(overrides: Partial<CaseListRepository> = {}, names?: ClientNamesPort) {
  const cases: CaseListRepository = {
    listByState: async () => ok([toReview]),
    listActiveClients: async () => ok([{ clientId: LUCIA, pending: 9000, since: new Date('2026-10-20T15:00:00Z') }]),
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
  it('arma las morosidades por revisar y las activas con el nombre de cada clienta', async () => {
    const result = await loadReview(deps())()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.toReview).toEqual([
      { caseId: toReview.id, clientId: ANA, clientName: 'Ana Pérez', pending: 20000, detectedAt: toReview.detectedAt },
    ])
    expect(result.value.active).toEqual([
      { clientId: LUCIA, clientName: 'Lucía Mora', pending: 9000, since: new Date('2026-10-20T15:00:00Z') },
    ])
  })

  it('pide los nombres una sola vez, con las clientas sin repetir', async () => {
    const namesFor = vi.fn(async () => ok(new Map<string, string>()))
    await loadReview(
      deps(
        { listActiveClients: async () => ok([{ clientId: ANA, pending: 5000, since: new Date('2026-10-20T15:00:00Z') }]) },
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

  it('sin morosidades devuelve las dos listas vacías', async () => {
    const result = await loadReview(
      deps({ listByState: async () => ok([]), listActiveClients: async () => ok([]) }),
    )()

    expect(isOk(result) && result.value).toEqual({ toReview: [], active: [] })
  })

  it('si falla la lectura de las morosidades o de los nombres, devuelve el error', async () => {
    const failing = () => err(delinquencyStorageFailed('boom'))
    const readFails = await loadReview(deps({ listByState: async () => failing() }))()
    const activeFails = await loadReview(deps({ listActiveClients: async () => failing() }))()
    const namesFail = await loadReview(deps({}, { namesFor: async () => failing() }))()

    expect(isErr(readFails)).toBe(true)
    expect(isErr(activeFails)).toBe(true)
    expect(isErr(namesFail)).toBe(true)
  })
})
