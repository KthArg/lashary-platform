import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { paymentReminderSettingsRepository, PAYMENT_REMINDER_SETTINGS_TABLE } from '../payment-reminder-settings-repository'

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: FakeResponse) => unknown) => resolve(response) }
  for (const method of ['select', 'single']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
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
