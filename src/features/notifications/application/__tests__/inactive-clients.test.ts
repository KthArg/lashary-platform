import { describe, it, expect, vi } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { inactiveQueueNotAllowed, isInactiveQueueEmpty, isInactiveQueueNotAllowed, isInactiveQueueTooMany } from '../../domain/errors'
import {
  INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND,
  INACTIVE_REMINDER_MIN_DAYS_BETWEEN,
  type InactiveClient,
} from '../../domain/inactive-reminder'
import { INACTIVE_CLIENTS_PAGE_SIZE, loadInactiveClients, queueInactiveReminders } from '../inactive-clients'
import type { InactiveClientsRepository } from '../ports'

const NOW = fixedDate('2026-11-22T15:00:00Z')
const clock = () => NOW

const CLIENT: InactiveClient = {
  clientId: '00000000-0000-0000-0000-0000000000c1',
  fullName: 'Ana Rodríguez',
  lastVisitAt: null,
  optedOut: false,
  lastReminder: null,
}

const OUTCOME = { queued: 2, alreadyQueued: 0, optedOut: 1, recent: 0, unknown: 0 }

const repository = (overrides: Partial<InactiveClientsRepository> = {}): InactiveClientsRepository => ({
  listPage: async () => ok({ clients: [CLIENT], total: 41 }),
  queue: async () => ok(OUTCOME),
  ...overrides,
})

describe('loadInactiveClients', () => {
  it('pide la página con la fecha de corte de hoy menos el rango (criterio 1)', async () => {
    const listPage = vi.fn(repository().listPage)

    const result = await loadInactiveClients({ repository: repository({ listPage }), clock })({ rangeDays: 90, page: 3 })

    expect(listPage).toHaveBeenCalledWith({
      since: fixedDate('2026-08-24T15:00:00Z'),
      offset: 2 * INACTIVE_CLIENTS_PAGE_SIZE,
      limit: INACTIVE_CLIENTS_PAGE_SIZE,
    })
    expect(isOk(result) && result.value).toEqual({
      rangeDays: 90,
      since: fixedDate('2026-08-24T15:00:00Z'),
      page: 3,
      pageSize: INACTIVE_CLIENTS_PAGE_SIZE,
      total: 41,
      clients: [CLIENT],
    })
  })

  it.each([0, -1, 1.5, Number.NaN])('una página inválida (%s) vuelve a la primera', async (page) => {
    const listPage = vi.fn(repository().listPage)

    await loadInactiveClients({ repository: repository({ listPage }), clock })({ rangeDays: 30, page })

    expect(listPage).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }))
  })

  it('un fallo de la base se devuelve tal cual, no como una lista vacía', async () => {
    const result = await loadInactiveClients({
      repository: repository({ listPage: async () => err('repository-failed') }),
      clock,
    })({ rangeDays: 90, page: 1 })

    expect(isErr(result) && result.error).toBe('repository-failed')
  })
})

describe('queueInactiveReminders', () => {
  it('pone en cola sin repetidos y con los topes del estudio (criterio 2)', async () => {
    const queue = vi.fn(repository().queue)

    const result = await queueInactiveReminders(repository({ queue }))(['c1', 'c2', 'c1'])

    expect(queue).toHaveBeenCalledWith(['c1', 'c2'], {
      maxClients: INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND,
      minDaysBetween: INACTIVE_REMINDER_MIN_DAYS_BETWEEN,
    })
    expect(isOk(result) && result.value).toEqual(OUTCOME)
  })

  it('una sola clienta es el envío individual', async () => {
    const queue = vi.fn(repository().queue)
    await queueInactiveReminders(repository({ queue }))(['c1'])
    expect(queue).toHaveBeenCalledWith(['c1'], expect.anything())
  })

  it('sin clientas no llama a la base', async () => {
    const queue = vi.fn(repository().queue)

    const result = await queueInactiveReminders(repository({ queue }))([])

    expect(queue).not.toHaveBeenCalled()
    expect(isErr(result) && isInactiveQueueEmpty(result.error)).toBe(true)
  })

  it('más clientas que el tope no llama a la base', async () => {
    const queue = vi.fn(repository().queue)
    const ids = Array.from({ length: INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND + 1 }, (_, i) => `c${i}`)

    const result = await queueInactiveReminders(repository({ queue }))(ids)

    expect(queue).not.toHaveBeenCalled()
    expect(isErr(result) && isInactiveQueueTooMany(result.error)).toBe(true)
  })

  it('el rechazo de la base (no es administradora) llega tipado', async () => {
    const result = await queueInactiveReminders(repository({ queue: async () => err(inactiveQueueNotAllowed()) }))(['c1'])
    expect(isErr(result) && isInactiveQueueNotAllowed(result.error)).toBe(true)
  })
})
