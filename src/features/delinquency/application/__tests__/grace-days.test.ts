import { describe, it, expect, vi } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { delinquencyStorageFailed, isInvalidGraceDays } from '../../domain/errors'
import { changeGraceDays, loadGraceDays } from '../grace-days'
import type { SettingsRepository } from '../ports'

const repository = (overrides: Partial<SettingsRepository> = {}): SettingsRepository => ({
  graceDays: async () => ok(7),
  setGraceDays: async (days) => ok(days),
  ...overrides,
})

describe('loadGraceDays', () => {
  it('devuelve la gracia que tiene configurada el estudio', async () => {
    const result = await loadGraceDays(repository())()

    expect(isOk(result) && result.value).toBe(7)
  })

  it('devuelve el fallo de la base tal cual', async () => {
    const failure = delinquencyStorageFailed('boom')

    const result = await loadGraceDays(repository({ graceDays: async () => err(failure) }))()

    expect(isErr(result) && result.error).toBe(failure)
  })
})

describe('changeGraceDays', () => {
  it('guarda una gracia válida y devuelve la que quedó', async () => {
    const setGraceDays = vi.fn(async (days: number) => ok(days))

    const result = await changeGraceDays(repository({ setGraceDays }))(14)

    expect(setGraceDays).toHaveBeenCalledWith(14)
    expect(isOk(result) && result.value).toBe(14)
  })

  it.each([[1], [90]])('acepta el límite de %d días', async (days) => {
    const result = await changeGraceDays(repository())(days)

    expect(isOk(result) && result.value).toBe(days)
  })

  it.each([[0], [91], [-3], [7.5], [Number.NaN]])(
    'rechaza %o sin llamar a la base: la gracia es un entero de 1 a 90',
    async (days) => {
      const setGraceDays = vi.fn(async (value: number) => ok(value))

      const result = await changeGraceDays(repository({ setGraceDays }))(days)

      expect(isErr(result) && isInvalidGraceDays(result.error)).toBe(true)
      expect(setGraceDays).not.toHaveBeenCalled()
    },
  )

  it('devuelve el fallo de la base tal cual', async () => {
    const failure = delinquencyStorageFailed('boom')

    const result = await changeGraceDays(repository({ setGraceDays: async () => err(failure) }))(10)

    expect(isErr(result) && result.error).toBe(failure)
  })
})
