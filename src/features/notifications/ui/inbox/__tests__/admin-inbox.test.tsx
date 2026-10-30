import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { INBOX_LIMIT, type InboxNotice } from '@/features/notifications/domain/inbox-notice'
import { AdminInbox } from '@/features/notifications/ui/inbox/components/AdminInbox'
import { INBOX_TEXTS } from '@/features/notifications/ui/inbox/constants/inbox-strings'

const mockMarkNotice = vi.fn()
const mockLoadMore = vi.fn()
const mockRefresh = vi.fn()

vi.mock('@/features/notifications/ui/inbox/actions/inbox-actions', () => ({
  markNoticeAction: (input: unknown) => mockMarkNotice(input),
  loadMoreNoticesAction: (input: unknown) => mockLoadMore(input),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

const unreadNotice: InboxNotice = {
  id: 'aviso-1',
  kind: 'booking_created',
  appointmentId: 'cita-1',
  clientName: 'Ana Pérez',
  serviceName: 'Lifting de pestañas',
  startsAt: fixedDate('2026-11-05T15:00:00Z'),
  readAt: null,
  createdAt: fixedDate('2026-10-29T18:00:00Z'),
}
const readNotice: InboxNotice = {
  ...unreadNotice,
  id: 'aviso-2',
  clientName: 'Laura Mora',
  readAt: fixedDate('2026-10-29T19:00:00Z'),
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /^Notificaciones/ }))
  return screen.getByRole('dialog', { hidden: true })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockMarkNotice.mockResolvedValue({ ok: true })
})
afterEach(cleanup)

describe('AdminInbox', () => {
  it('el botón del menú dice cuántos avisos quedan sin leer', () => {
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: [unreadNotice, readNotice], hasMore: false, unreadCount: 1 } }} />)

    const trigger = screen.getByRole('button', { name: INBOX_TEXTS.triggerLabel(1) })
    expect(within(trigger).getByText('1')).toBeDefined()
  })

  it('al abrirse muestra clienta, servicio, fecha y hora de cada reserva (criterios 1 y 2)', () => {
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: [unreadNotice], hasMore: false, unreadCount: 1 } }} />)

    const panel = openPanel()

    expect(panel.hasAttribute('open')).toBe(true)
    expect(within(panel).getByText(INBOX_TEXTS.bookingCreated('Ana Pérez'))).toBeDefined()
    expect(within(panel).getByText('Lifting de pestañas')).toBeDefined()
    expect(within(panel).getByText(/5 de noviembre.*9:00/)).toBeDefined()
    expect(within(panel).getByText(INBOX_TEXTS.unread)).toBeDefined()
  })

  it('marca un aviso sin leer como leído, y uno leído como no leído (criterio 3)', async () => {
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: [unreadNotice, readNotice], hasMore: false, unreadCount: 1 } }} />)
    const panel = openPanel()

    fireEvent.click(within(panel).getByRole('button', { name: INBOX_TEXTS.markRead, hidden: true }))
    await waitFor(() => expect(mockMarkNotice).toHaveBeenCalledWith({ id: 'aviso-1', read: true }))

    const markUnreadButton = within(panel).getByRole('button', { name: INBOX_TEXTS.markUnread, hidden: true })
    await waitFor(() => expect(markUnreadButton.hasAttribute('disabled')).toBe(false))
    fireEvent.click(markUnreadButton)
    await waitFor(() => expect(mockMarkNotice).toHaveBeenCalledWith({ id: 'aviso-2', read: false }))
  })

  it('si no se pudo guardar, lo dice en vez de fingir que cambió', async () => {
    mockMarkNotice.mockResolvedValue({ ok: false, error: 'No se pudo guardar el cambio. Intentá de nuevo.' })
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: [unreadNotice], hasMore: false, unreadCount: 1 } }} />)
    const panel = openPanel()

    fireEvent.click(within(panel).getByRole('button', { name: INBOX_TEXTS.markRead, hidden: true }))

    expect((await within(panel).findByRole('alert', { hidden: true })).textContent).toBe(
      'No se pudo guardar el cambio. Intentá de nuevo.',
    )
  })

  it('sin avisos muestra el estado vacío y el botón no lleva número', () => {
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: [], hasMore: false, unreadCount: 0 } }} />)

    const panel = openPanel()

    expect(screen.getByRole('button', { name: INBOX_TEXTS.triggerLabel(0) })).toBeDefined()
    expect(within(panel).getByText(INBOX_TEXTS.empty)).toBeDefined()
  })

  it('si la bandeja no cargó, muestra el error con reintento y nunca «sin avisos»', () => {
    render(<AdminInbox inbox={{ ok: false }} />)
    const panel = openPanel()

    expect(within(panel).getByRole('alert', { hidden: true }).textContent).toContain(INBOX_TEXTS.loadFailed)
    expect(within(panel).queryByText(INBOX_TEXTS.empty)).toBeNull()

    fireEvent.click(within(panel).getByRole('button', { name: INBOX_TEXTS.retry, hidden: true }))
    expect(mockRefresh).toHaveBeenCalledOnce()
  })

  it('con más de 20 avisos, «Ver más» trae los siguientes y se pueden marcar; al cerrar vuelve a los primeros 20', async () => {
    const firstTwenty = Array.from({ length: INBOX_LIMIT }, (_, index) => ({
      ...readNotice,
      id: `aviso-${index + 1}`,
      clientName: `Clienta ${index + 1}`,
    }))
    const olderUnread: InboxNotice = { ...unreadNotice, id: 'aviso-21', clientName: 'Clienta 21' }
    mockLoadMore.mockResolvedValue({ ok: true, page: { notices: [olderUnread], hasMore: false } })
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: firstTwenty, hasMore: true, unreadCount: 1 } }} />)
    const panel = openPanel()

    fireEvent.click(within(panel).getByRole('button', { name: INBOX_TEXTS.loadMore, hidden: true }))

    expect(await within(panel).findByText(INBOX_TEXTS.bookingCreated('Clienta 21'))).toBeDefined()
    expect(mockLoadMore).toHaveBeenCalledWith({ offset: INBOX_LIMIT })
    expect(within(panel).queryByRole('button', { name: INBOX_TEXTS.loadMore, hidden: true })).toBeNull()

    fireEvent.click(within(panel).getByRole('button', { name: INBOX_TEXTS.markRead, hidden: true }))
    await waitFor(() => expect(mockMarkNotice).toHaveBeenCalledWith({ id: 'aviso-21', read: true }))
    expect(await within(panel).findAllByRole('button', { name: INBOX_TEXTS.markUnread, hidden: true })).toHaveLength(
      INBOX_LIMIT + 1,
    )

    fireEvent.click(within(panel).getByRole('button', { name: INBOX_TEXTS.close, hidden: true }))
    fireEvent(panel, new Event('close'))

    await waitFor(() => expect(within(panel).queryByText(INBOX_TEXTS.bookingCreated('Clienta 21'))).toBeNull())
    expect(within(panel).getByRole('button', { name: INBOX_TEXTS.loadMore, hidden: true })).toBeDefined()
  })
})
