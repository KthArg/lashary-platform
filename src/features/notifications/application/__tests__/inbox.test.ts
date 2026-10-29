import { describe, it, expect } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { INBOX_LIMIT, type InboxNotice } from '../../domain/inbox-notice'
import { loadInbox, markNotice } from '../inbox'
import type { InboxRepository } from '../ports'

const NOW = '2026-10-29T19:00:00Z'

const notice: InboxNotice = {
  id: 'aviso-1',
  kind: 'booking_created',
  appointmentId: 'cita-1',
  clientName: 'Ana Pérez',
  serviceName: 'Lifting de pestañas',
  startsAt: fixedDate('2026-11-05T15:00:00Z'),
  readAt: null,
  createdAt: fixedDate('2026-10-29T18:00:00Z'),
}

function buildRepository(overrides: Partial<InboxRepository> = {}) {
  const requestedLimits: number[] = []
  const writes: Array<{ id: string; readAt: Date | null }> = []
  const repository: InboxRepository = {
    listRecent: async (limit) => (requestedLimits.push(limit), ok([notice])),
    countUnread: async () => ok(1),
    setReadAt: async (id, readAt) => (writes.push({ id, readAt }), ok({ updated: true })),
    ...overrides,
  }
  return { repository, requestedLimits, writes }
}

describe('loadInbox', () => {
  it('trae los 20 avisos más recientes y cuántos quedan sin leer', async () => {
    const { repository, requestedLimits } = buildRepository()

    const result = await loadInbox(repository)()

    expect(requestedLimits).toEqual([INBOX_LIMIT])
    expect(isOk(result) && result.value).toEqual({ notices: [notice], unreadCount: 1 })
  })

  it('si falla la lista o el conteo, la bandeja es un error y no una bandeja vacía', async () => {
    const listFails = buildRepository({ listRecent: async () => err('repository-failed' as const) })
    const countFails = buildRepository({ countUnread: async () => err('repository-failed' as const) })

    expect(isErr(await loadInbox(listFails.repository)())).toBe(true)
    expect(isErr(await loadInbox(countFails.repository)())).toBe(true)
  })
})

describe('markNotice', () => {
  it('marcar como leído guarda la hora del reloj, y como no leído la quita (criterio 3)', async () => {
    const { repository, writes } = buildRepository()
    const mark = markNotice({ repository, clock: fixedClock(NOW) })

    expect(isOk(await mark({ id: 'aviso-1', read: true }))).toBe(true)
    expect(isOk(await mark({ id: 'aviso-1', read: false }))).toBe(true)

    expect(writes).toEqual([
      { id: 'aviso-1', readAt: fixedDate(NOW) },
      { id: 'aviso-1', readAt: null },
    ])
  })

  it('un aviso que no existe o que la sesión no puede tocar es notice-not-found', async () => {
    const { repository } = buildRepository({ setReadAt: async () => ok({ updated: false }) })

    const result = await markNotice({ repository, clock: fixedClock(NOW) })({ id: 'ajeno', read: true })

    expect(isErr(result) && result.error).toBe('notice-not-found')
  })

  it('un fallo de la base al marcar se propaga como error', async () => {
    const { repository } = buildRepository({ setReadAt: async () => err('repository-failed' as const) })

    const result = await markNotice({ repository, clock: fixedClock(NOW) })({ id: 'aviso-1', read: true })

    expect(isErr(result) && result.error).toBe('repository-failed')
  })
})
