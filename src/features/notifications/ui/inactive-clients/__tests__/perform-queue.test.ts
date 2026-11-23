import { describe, it, expect, vi } from 'vitest'
import { ok, err } from '@/shared/result'
import {
  inactiveQueueEmpty,
  inactiveQueueNotAllowed,
  inactiveQueueTooMany,
} from '@/features/notifications/domain/errors'
import { INACTIVE_SEND_FIELDS, inactiveSendMessages as copy } from '../constants/inactive-send-strings'
import { performQueueInactiveReminders } from '../utils/perform-queue'

const ID_A = '00000000-0000-0000-0000-0000000000c1'
const ID_B = '00000000-0000-0000-0000-0000000000c2'

const form = (entries: [string, string][]) => {
  const data = new FormData()
  for (const [key, value] of entries) data.append(key, value)
  return data
}

const OUTCOME = { queued: 2, alreadyQueued: 1, optedOut: 1, recent: 1, unknown: 0 }

describe('performQueueInactiveReminders', () => {
  it('envío masivo: pone en cola las marcadas y anuncia cuántas quedaron y por qué faltan las demás (criterio 2)', async () => {
    const queue = vi.fn(async () => ok(OUTCOME))

    const state = await performQueueInactiveReminders(queue, form([
      [INACTIVE_SEND_FIELDS.selected, ID_A],
      [INACTIVE_SEND_FIELDS.selected, ID_B],
    ]))

    expect(queue).toHaveBeenCalledWith([ID_A, ID_B])
    expect(state).toEqual({ status: 'success', message: copy.outcome(OUTCOME) })
  })

  it('envío individual: el botón de la fila manda solo a esa clienta, aunque haya otras marcadas', async () => {
    const queue = vi.fn(async () => ok({ queued: 1, alreadyQueued: 0, optedOut: 0, recent: 0, unknown: 0 }))

    await performQueueInactiveReminders(queue, form([
      [INACTIVE_SEND_FIELDS.selected, ID_A],
      [INACTIVE_SEND_FIELDS.single, ID_B],
    ]))

    expect(queue).toHaveBeenCalledWith([ID_B])
  })

  it('un id que no es un uuid no llega a la base', async () => {
    const queue = vi.fn(async () => ok(OUTCOME))

    const state = await performQueueInactiveReminders(queue, form([[INACTIVE_SEND_FIELDS.selected, 'no-es-un-id']]))

    expect(queue).not.toHaveBeenCalled()
    expect(state).toEqual({ status: 'error', message: copy.invalid })
  })

  it.each([
    ['sin marcadas', inactiveQueueEmpty(), copy.empty],
    ['más que el tope', inactiveQueueTooMany(50), copy.tooMany(50)],
    ['sin permiso', inactiveQueueNotAllowed(), copy.notAllowed],
    ['un fallo de la base', 'repository-failed' as const, copy.failed],
  ])('%s se anuncia con su mensaje', async (_, failure, message) => {
    const state = await performQueueInactiveReminders(async () => err(failure), form([[INACTIVE_SEND_FIELDS.selected, ID_A]]))
    expect(state).toEqual({ status: 'error', message })
  })
})

describe('copy.outcome', () => {
  it('nombra solo los motivos que pasaron', () => {
    expect(copy.outcome({ queued: 1, alreadyQueued: 0, optedOut: 0, recent: 0, unknown: 0 })).toBe(copy.queued(1))
  })

  it('con todo en cero dice que no quedó ninguno', () => {
    expect(copy.outcome({ queued: 0, alreadyQueued: 2, optedOut: 0, recent: 0, unknown: 0 })).toContain(copy.queued(0))
  })
})
