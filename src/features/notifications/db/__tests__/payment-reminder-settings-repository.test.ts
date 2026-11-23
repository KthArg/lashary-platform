import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isInvalidPaymentReminderFrequencyDays } from '../../domain/errors'
import { paymentReminderSettingsRepository, PAYMENT_REMINDER_SETTINGS_TABLE, SET_FREQUENCY_DAYS_FUNCTION } from '../payment-reminder-settings-repository'

type FakeResponse = { data: unknown; error: { message: string; code?: string } | null }

const PG_INVALID_PARAMETER = '22023'
const PG_INSUFFICIENT_PRIVILEGE = '42501'

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: FakeResponse) => unknown) => resolve(response) }
  for (const method of ['select', 'single']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = {
    from: (table: string) => (calls.push(['from', table]), query),
    rpc: async (name: string, args: unknown) => (calls.push(['rpc', name, args]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('paymentReminderSettingsRepository.frequencyDays', () => {
  it('lee la frecuencia de la fila única de configuración', async () => {
    const { db, calls } = createFakeDb({ data: { frequency_days: 7 }, error: null })

    const result = await paymentReminderSettingsRepository(db).frequencyDays()

    expect(calls).toEqual([['from', PAYMENT_REMINDER_SETTINGS_TABLE], ['select', 'frequency_days'], ['single']])
    expect(isOk(result) && result.value).toBe(7)
  })

  it('un error de la base es un fallo, no una frecuencia inventada', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'caída' } })

    const result = await paymentReminderSettingsRepository(db).frequencyDays()

    expect(isErr(result) && result.error).toBe('repository-failed')
  })

  it.each([[null], [{}], [{ frequency_days: '7' }], [{ frequency_days: 7.5 }]])('una fila inesperada (%j) es un fallo', async (row) => {
    const { db } = createFakeDb({ data: row, error: null })

    const result = await paymentReminderSettingsRepository(db).frequencyDays()

    expect(isErr(result)).toBe(true)
  })
})

describe('paymentReminderSettingsRepository.setFrequencyDays', () => {
  it('llama a la función de la base con los días y devuelve el valor que quedó', async () => {
    const { db, calls } = createFakeDb({ data: 14, error: null })

    const result = await paymentReminderSettingsRepository(db).setFrequencyDays(14)

    expect(calls).toEqual([['rpc', SET_FREQUENCY_DAYS_FUNCTION, { p_days: 14 }]])
    expect(isOk(result) && result.value).toBe(14)
  })

  it('traduce el rechazo de la base por un valor fuera de rango', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'rango', code: PG_INVALID_PARAMETER } })

    const result = await paymentReminderSettingsRepository(db).setFrequencyDays(31)

    expect(isErr(result) && isInvalidPaymentReminderFrequencyDays(result.error)).toBe(true)
  })

  it('cualquier otro error de la base es un fallo', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'permission denied', code: PG_INSUFFICIENT_PRIVILEGE } })

    const result = await paymentReminderSettingsRepository(db).setFrequencyDays(10)

    expect(isErr(result) && result.error).toBe('repository-failed')
  })

  it.each([[null], ['14'], [1.5]])('una respuesta con forma inesperada (%j) es un fallo', async (data) => {
    const { db } = createFakeDb({ data, error: null })

    const result = await paymentReminderSettingsRepository(db).setFrequencyDays(14)

    expect(isErr(result)).toBe(true)
  })
})
