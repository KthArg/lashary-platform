import { describe, it, expect } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { discoverDuePaymentReminders, type DiscoverDuePaymentRemindersDeps } from '../discover-due-payment-reminders'

const ANA = 'ana-id'
const LUCIA = 'lucia-id'
const NOW = fixedDate('2026-11-17T12:00:00Z')

type BuildOptions = {
  activeClientIds?: string[]
  lastSent?: Record<string, Date>
  owed?: Record<string, number>
  frequencyDays?: number
  failAt?: 'active' | 'lastSent'
  failOwedFor?: string[]
}

function buildDeps(options: BuildOptions = {}) {
  const owedCalls: string[] = []
  const deps: DiscoverDuePaymentRemindersDeps = {
    listActiveClientIds: async () => (options.failAt === 'active' ? err('repository-failed' as const) : ok(options.activeClientIds ?? [ANA])),
    lastSentAt: async () =>
      options.failAt === 'lastSent' ? err('repository-failed' as const) : ok(new Map(Object.entries(options.lastSent ?? {}))),
    owedBy: async (clientId) => {
      owedCalls.push(clientId)
      return options.failOwedFor?.includes(clientId) ? err('repository-failed' as const) : ok(options.owed?.[clientId] ?? 18000)
    },
    frequencyDays: options.frequencyDays ?? 7,
    now: NOW,
  }
  return { deps, owedCalls }
}

describe('discoverDuePaymentReminders', () => {
  it('una clienta con morosidad activa y sin recordatorio anterior toca ya, con el monto de hoy (criterios 1 y 2)', async () => {
    const { deps } = buildDeps({ owed: { [ANA]: 18000 } })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value.due).toEqual([{ clientId: ANA, amountOwed: 18000 }])
  })

  it('sin clientas con morosidad activa no hay nada que enviar y no se consulta nada más', async () => {
    const { deps, owedCalls } = buildDeps({ activeClientIds: [] })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value.due).toEqual([])
    expect(owedCalls).toEqual([])
  })

  it('no repite el recordatorio antes de cumplirse la frecuencia configurada (criterio 1)', async () => {
    const { deps, owedCalls } = buildDeps({ lastSent: { [ANA]: fixedDate('2026-11-14T12:00:00Z') }, frequencyDays: 7 })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value.due).toEqual([])
    expect(owedCalls).toEqual([])
  })

  it('lo repite al cumplirse la frecuencia', async () => {
    const { deps } = buildDeps({ lastSent: { [ANA]: fixedDate('2026-11-10T12:00:00Z') }, frequencyDays: 7 })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value.due).toEqual([{ clientId: ANA, amountOwed: 18000 }])
  })

  it('la frecuencia configurada manda: con 1 día toca al día siguiente', async () => {
    const { deps } = buildDeps({ lastSent: { [ANA]: fixedDate('2026-11-16T12:00:00Z') }, frequencyDays: 1 })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value.due).toHaveLength(1)
  })

  it('una morosidad ya saldada, con saldo cero, no recibe recordatorio (criterio 3)', async () => {
    const { deps } = buildDeps({ owed: { [ANA]: 0 } })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value.due).toEqual([])
  })

  it('mezcla: solo recibe quien le toca y todavía debe', async () => {
    const { deps, owedCalls } = buildDeps({
      activeClientIds: [ANA, LUCIA],
      lastSent: { [ANA]: fixedDate('2026-11-16T12:00:00Z') },
      owed: { [LUCIA]: 5000 },
    })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value.due).toEqual([{ clientId: LUCIA, amountOwed: 5000 }])
    expect(owedCalls).toEqual([LUCIA])
  })

  it('el fallo al pedir el saldo de una clienta no frena a las que siguen y se cuenta como error', async () => {
    const { deps } = buildDeps({ activeClientIds: [ANA, LUCIA], failOwedFor: [ANA], owed: { [LUCIA]: 5000 } })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value).toEqual({ due: [{ clientId: LUCIA, amountOwed: 5000 }], errored: 1 })
  })

  it('sin ningún error, el conteo de errores es cero', async () => {
    const { deps } = buildDeps()

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value.errored).toBe(0)
  })

  it.each(['active', 'lastSent'] as const)('si falla la lectura de %s, devuelve el fallo y no un envío a medias', async (failAt) => {
    const { deps } = buildDeps({ failAt })

    const result = await discoverDuePaymentReminders(deps)

    expect(isErr(result)).toBe(true)
  })
})
