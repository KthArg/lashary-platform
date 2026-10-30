import { describe, it, expect } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { INBOX_LIMIT, type InboxNotice } from '../../domain/inbox-notice'
import { inboxStorageFailed } from '../../domain/errors'
import { loadInbox, loadMoreNotices, markNotice } from '../inbox'
import type { InboxPageRequest, InboxRepository } from '../ports'

const NOW = '2026-10-29T19:00:00Z'
const STORAGE_FAILED = inboxStorageFailed('caída')

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
  const requestedPages: InboxPageRequest[] = []
  const writes: Array<{ id: string; readAt: Date | null }> = []
  const repository: InboxRepository = {
    listRecent: async (page) => (requestedPages.push(page), ok({ notices: [notice], hasMore: true })),
    countUnread: async () => ok(25),
    setReadAt: async (id, readAt) => (writes.push({ id, readAt }), ok({ updated: true })),
    ...overrides,
  }
  return { repository, requestedPages, writes }
}

describe('loadInbox', () => {
  it('trae la primera página de 20, si hay más, y cuántos quedan sin leer en total', async () => {
    const { repository, requestedPages } = buildRepository()

    const result = await loadInbox(repository)()

    expect(requestedPages).toEqual([{ offset: 0, limit: INBOX_LIMIT }])
    expect(isOk(result) && result.value).toEqual({ notices: [notice], hasMore: true, unreadCount: 25 })
  })

  it('si falla la lista o el conteo, la bandeja es un error con su causa y no una bandeja vacía', async () => {
    const listFails = buildRepository({ listRecent: async () => err(STORAGE_FAILED) })
    const countFails = buildRepository({ countUnread: async () => err(STORAGE_FAILED) })

    const listResult = await loadInbox(listFails.repository)()
    expect(isErr(listResult) && listResult.error.cause).toBe('caída')
    expect(isErr(await loadInbox(countFails.repository)())).toBe(true)
  })
})

describe('loadMoreNotices', () => {
  it('con más de 20 avisos, «ver más» pide los siguientes 20 desde donde quedó', async () => {
    const { repository, requestedPages } = buildRepository()

    await loadMoreNotices(repository)(INBOX_LIMIT)
    await loadMoreNotices(repository)(INBOX_LIMIT * 2)

    expect(requestedPages).toEqual([
      { offset: INBOX_LIMIT, limit: INBOX_LIMIT },
      { offset: INBOX_LIMIT * 2, limit: INBOX_LIMIT },
    ])
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

  it('un fallo de la base al marcar se propaga con su causa', async () => {
    const { repository } = buildRepository({ setReadAt: async () => err(STORAGE_FAILED) })

    const result = await markNotice({ repository, clock: fixedClock(NOW) })({ id: 'aviso-1', read: true })

    expect(isErr(result) && result.error).toEqual(STORAGE_FAILED)
  })
})
