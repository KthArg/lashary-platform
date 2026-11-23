import { describe, it, expect } from 'vitest'
import { ok, err, isOk, isErr } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { discoverDuePaymentReminders, type DiscoverDuePaymentRemindersDeps } from '../discover-due-payment-reminders'

const ANA = 'ana-id'
const LUCIA = 'lucia-id'
const NOW = fixedDate('2026-11-17T12:00:00Z')

type BuildOptions = {
  owed?: Record<string, number>
  lastSent?: Record<string, Date>
  frequencyDays?: number
  failAt?: 'owed' | 'lastSent'
}

function buildDeps(options: BuildOptions = {}) {
  const calls = { listOwedByClient: 0, lastSentAt: [] as string[][] }
  const deps: DiscoverDuePaymentRemindersDeps = {
    listOwedByClient: async () => {
      calls.listOwedByClient += 1
      return options.failAt === 'owed' ? err('repository-failed' as const) : ok(new Map(Object.entries(options.owed ?? { [ANA]: 18000 })))
    },
    lastSentAt: async (clientIds) => {
      calls.lastSentAt.push([...clientIds])
      return options.failAt === 'lastSent' ? err('repository-failed' as const) : ok(new Map(Object.entries(options.lastSent ?? {})))
    },
    frequencyDays: options.frequencyDays ?? 7,
    now: NOW,
  }
  return { deps, calls }
}

describe('discoverDuePaymentReminders', () => {
  it('una clienta con morosidad activa y sin recordatorio anterior toca ya, con el monto de hoy (criterios 1 y 2)', async () => {
    const { deps } = buildDeps({ owed: { [ANA]: 18000 } })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value).toEqual([{ clientId: ANA, amountOwed: 18000 }])
  })

  it('sin clientas con saldo no hay nada que enviar y no se consulta el último envío', async () => {
    const { deps, calls } = buildDeps({ owed: {} })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value).toEqual([])
    expect(calls.lastSentAt).toEqual([])
  })

  it('no repite el recordatorio antes de cumplirse la frecuencia configurada (criterio 1)', async () => {
    const { deps } = buildDeps({ lastSent: { [ANA]: fixedDate('2026-11-14T12:00:00Z') }, frequencyDays: 7 })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value).toEqual([])
  })

  it('lo repite al cumplirse la frecuencia', async () => {
    const { deps } = buildDeps({ lastSent: { [ANA]: fixedDate('2026-11-10T12:00:00Z') }, frequencyDays: 7 })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value).toEqual([{ clientId: ANA, amountOwed: 18000 }])
  })

  it('la frecuencia configurada manda: con 1 día toca al día siguiente', async () => {
    const { deps } = buildDeps({ lastSent: { [ANA]: fixedDate('2026-11-16T12:00:00Z') }, frequencyDays: 1 })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value).toHaveLength(1)
  })

  it('mezcla: solo recibe quien le toca por la frecuencia', async () => {
    const { deps } = buildDeps({
      owed: { [ANA]: 18000, [LUCIA]: 5000 },
      lastSent: { [ANA]: fixedDate('2026-11-16T12:00:00Z') },
    })

    const result = await discoverDuePaymentReminders(deps)

    expect(isOk(result) && result.value).toEqual([{ clientId: LUCIA, amountOwed: 5000 }])
  })

  it('pide los saldos de todas de una vez y el último envío de todas en una sola consulta, sin llamadas por clienta', async () => {
    const { deps, calls } = buildDeps({ owed: { [ANA]: 18000, [LUCIA]: 5000 } })

    await discoverDuePaymentReminders(deps)

    expect(calls.listOwedByClient).toBe(1)
    expect(calls.lastSentAt).toEqual([[ANA, LUCIA]])
  })

  it.each(['owed', 'lastSent'] as const)('si falla la lectura de %s, devuelve el fallo y no un envío a medias', async (failAt) => {
    const { deps } = buildDeps({ failAt })

    const result = await discoverDuePaymentReminders(deps)

    expect(isErr(result)).toBe(true)
  })
})
