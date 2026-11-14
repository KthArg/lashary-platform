import { describe, it, expect } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { discoverDueReapplications, type DiscoverDueReapplicationsDeps } from '../discover-reapplication-reminders'
import type { DelinquencyState, ReapplicationCandidate, TechniqueReapplicationInfo } from '../ports'

const CLASICO: TechniqueReapplicationInfo = { name: 'Clásico', intervalDays: 30 }

function buildDeps(options: {
  candidates: ReapplicationCandidate[]
  techniques?: ReadonlyMap<string, TechniqueReapplicationInfo>
  states?: ReadonlyMap<string, DelinquencyState>
  anticipationDays?: number
  now?: Date
  failAt?: 'candidates' | 'techniques' | 'states'
}): DiscoverDueReapplicationsDeps {
  return {
    listCandidates: async () =>
      options.failAt === 'candidates' ? err('repository-failed' as const) : ok(options.candidates),
    listTechniquesWithInterval: async () =>
      options.failAt === 'techniques'
        ? err('repository-failed' as const)
        : ok(options.techniques ?? new Map([['tecnica-1', CLASICO]])),
    statesFor: async () =>
      options.failAt === 'states' ? err('repository-failed' as const) : ok(options.states ?? new Map()),
    anticipationDays: options.anticipationDays ?? 7,
    now: options.now ?? fixedDate('2026-11-13T00:00:00Z'),
  }
}

describe('discoverDueReapplications', () => {
  it('incluye una candidata cuya fecha estimada ya entró en la ventana de anticipación', async () => {
    const deps = buildDeps({
      candidates: [{ clientId: 'client-1', techniqueId: 'tecnica-1', lastCompletedAt: fixedDate('2026-10-14T00:00:00Z') }],
    })

    const result = await discoverDueReapplications(deps)

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual([
      {
        clientId: 'client-1',
        techniqueId: 'tecnica-1',
        techniqueName: 'Clásico',
        lastCompletedAt: fixedDate('2026-10-14T00:00:00Z'),
        dueAt: fixedDate('2026-11-13T00:00:00Z'),
      },
    ])
  })

  it('no incluye una candidata cuya fecha estimada todavía está lejos', async () => {
    const deps = buildDeps({
      candidates: [{ clientId: 'client-1', techniqueId: 'tecnica-1', lastCompletedAt: fixedDate('2026-11-01T00:00:00Z') }],
    })

    const result = await discoverDueReapplications(deps)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })

  it('excluye a una clienta con morosidad activa', async () => {
    const deps = buildDeps({
      candidates: [{ clientId: 'client-1', techniqueId: 'tecnica-1', lastCompletedAt: fixedDate('2026-10-14T00:00:00Z') }],
      states: new Map([['client-1', 'active']]),
    })

    const result = await discoverDueReapplications(deps)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })

  it('una morosidad solo pending_review no excluye (DOM-012: todavía sin consecuencia)', async () => {
    const deps = buildDeps({
      candidates: [{ clientId: 'client-1', techniqueId: 'tecnica-1', lastCompletedAt: fixedDate('2026-10-14T00:00:00Z') }],
      states: new Map([['client-1', 'pending_review']]),
    })

    const result = await discoverDueReapplications(deps)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toHaveLength(1)
  })

  it('una técnica sin intervalo configurado no entra al cálculo', async () => {
    const deps = buildDeps({
      candidates: [{ clientId: 'client-1', techniqueId: 'tecnica-sin-intervalo', lastCompletedAt: fixedDate('2026-01-01T00:00:00Z') }],
      techniques: new Map(),
    })

    const result = await discoverDueReapplications(deps)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })

  it.each(['candidates', 'techniques', 'states'] as const)(
    'un fallo al leer %s detiene todo con RepositoryFailure',
    async (failAt) => {
      const deps = buildDeps({
        candidates: [{ clientId: 'client-1', techniqueId: 'tecnica-1', lastCompletedAt: fixedDate('2026-10-14T00:00:00Z') }],
        failAt,
      })

      const result = await discoverDueReapplications(deps)

      expect(isErr(result)).toBe(true)
      if (isErr(result)) expect(result.error).toBe('repository-failed')
    },
  )
})
