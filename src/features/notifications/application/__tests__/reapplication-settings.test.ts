import { describe, it, expect, vi } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { isInvalidAnticipationDays } from '../../domain/errors'
import { changeAnticipationDays, loadAnticipationDays } from '../reapplication-settings'
import type { ReapplicationSettingsRepository } from '../ports'

const repository = (overrides: Partial<ReapplicationSettingsRepository> = {}): ReapplicationSettingsRepository => ({
  anticipationDays: async () => ok(7),
  setAnticipationDays: async (days) => ok(days),
  ...overrides,
})

describe('loadAnticipationDays', () => {
  it('devuelve la anticipación que tiene configurada el estudio', async () => {
    const result = await loadAnticipationDays(repository())()

    expect(isOk(result) && result.value).toBe(7)
  })

  it('devuelve el fallo de la base tal cual', async () => {
    const result = await loadAnticipationDays(repository({ anticipationDays: async () => err('repository-failed') }))()

    expect(isErr(result) && result.error).toBe('repository-failed')
  })
})

describe('changeAnticipationDays', () => {
  it('guarda una anticipación válida y devuelve la que quedó', async () => {
    const setAnticipationDays = vi.fn(async (days: number) => ok(days))

    const result = await changeAnticipationDays(repository({ setAnticipationDays }))(14)

    expect(setAnticipationDays).toHaveBeenCalledWith(14)
    expect(isOk(result) && result.value).toBe(14)
  })

  it.each([[1], [30]])('acepta el límite de %d días', async (days) => {
    const result = await changeAnticipationDays(repository())(days)

    expect(isOk(result) && result.value).toBe(days)
  })

  it.each([[0], [31], [-3], [7.5], [Number.NaN]])(
    'rechaza %o sin llamar a la base: la anticipación es un entero de 1 a 30',
    async (days) => {
      const setAnticipationDays = vi.fn(async (value: number) => ok(value))

      const result = await changeAnticipationDays(repository({ setAnticipationDays }))(days)

      expect(isErr(result) && isInvalidAnticipationDays(result.error)).toBe(true)
      expect(setAnticipationDays).not.toHaveBeenCalled()
    },
  )

  it('devuelve el fallo de la base tal cual', async () => {
    const result = await changeAnticipationDays(repository({ setAnticipationDays: async () => err('repository-failed') }))(10)

    expect(isErr(result) && result.error).toBe('repository-failed')
  })
})
