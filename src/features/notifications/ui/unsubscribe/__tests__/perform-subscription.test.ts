import { describe, it, expect, vi } from 'vitest'
import { ok, err } from '@/shared/result'
import type { InactiveSubscriptionRepository } from '@/features/notifications/application/ports'
import { UNSUBSCRIBE_FIELDS } from '../constants/unsubscribe-strings'
import { performSubscriptionChange } from '../utils/perform-subscription'

const SAMPLE_UUID = '3f2b8c1e-9d4a-4c6b-8e2f-1a7b5c9d0e3f'

const repository = (overrides: Partial<InactiveSubscriptionRepository> = {}): InactiveSubscriptionRepository => ({
  unsubscribe: vi.fn(async () => ok(undefined)),
  resubscribe: vi.fn(async () => ok(undefined)),
  ...overrides,
})

const form = (token: string, intent: string) => {
  const data = new FormData()
  data.set(UNSUBSCRIBE_FIELDS.token, token)
  data.set(UNSUBSCRIBE_FIELDS.intent, intent)
  return data
}

describe('performSubscriptionChange', () => {
  it('darse de baja deja la baja guardada y lo anuncia (criterio 4)', async () => {
    const repo = repository()
    const state = await performSubscriptionChange(repo, form(SAMPLE_UUID, 'unsubscribe'))
    expect(repo.unsubscribe).toHaveBeenCalledWith(SAMPLE_UUID)
    expect(state).toEqual({ status: 'unsubscribed' })
  })

  it('volver a suscribirse borra la baja (decisión del PO)', async () => {
    const repo = repository()
    const state = await performSubscriptionChange(repo, form(SAMPLE_UUID, 'resubscribe'))
    expect(repo.resubscribe).toHaveBeenCalledWith(SAMPLE_UUID)
    expect(state).toEqual({ status: 'subscribed' })
  })

  it.each([
    ['un token que no es un uuid', 'no-es-un-token', 'unsubscribe'],
    ['una intención desconocida', SAMPLE_UUID, 'borrar'],
  ])('%s no llega a la base', async (_, token, intent) => {
    const repo = repository()
    const state = await performSubscriptionChange(repo, form(token, intent))
    expect(repo.unsubscribe).not.toHaveBeenCalled()
    expect(repo.resubscribe).not.toHaveBeenCalled()
    expect(state).toEqual({ status: 'invalid' })
  })

  it('un fallo de la base se anuncia como error, para reintentar', async () => {
    const state = await performSubscriptionChange(
      repository({ unsubscribe: async () => err('repository-failed') }),
      form(SAMPLE_UUID, 'unsubscribe'),
    )
    expect(state).toEqual({ status: 'error' })
  })
})
