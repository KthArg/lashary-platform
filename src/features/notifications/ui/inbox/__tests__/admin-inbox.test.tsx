import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { fixedDate } from '@/shared/testing/fixed-clock'
import type { InboxNotice } from '../../../domain/inbox-notice'
import { AdminInbox } from '../components/AdminInbox'
import { INBOX_TEXTS } from '../constants/inbox-strings'

const mockMarkNotice = vi.fn()
const mockRefresh = vi.fn()

vi.mock('../actions/inbox-actions', () => ({ markNoticeAction: (input: unknown) => mockMarkNotice(input) }))
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
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: [unreadNotice, readNotice], unreadCount: 1 } }} />)

    const trigger = screen.getByRole('button', { name: INBOX_TEXTS.triggerLabel(1) })
    expect(within(trigger).getByText('1')).toBeDefined()
  })

  it('al abrirse muestra clienta, servicio, fecha y hora de cada reserva (criterios 1 y 2)', () => {
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: [unreadNotice], unreadCount: 1 } }} />)

    const panel = openPanel()

    expect(panel.hasAttribute('open')).toBe(true)
    expect(within(panel).getByText(INBOX_TEXTS.bookingCreated('Ana Pérez'))).toBeDefined()
    expect(within(panel).getByText('Lifting de pestañas')).toBeDefined()
    expect(within(panel).getByText(/5 de noviembre.*9:00/)).toBeDefined()
    expect(within(panel).getByText(INBOX_TEXTS.unread)).toBeDefined()
  })

  it('marca un aviso sin leer como leído, y uno leído como no leído (criterio 3)', async () => {
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: [unreadNotice, readNotice], unreadCount: 1 } }} />)
    const panel = openPanel()

    fireEvent.click(within(panel).getByRole('button', { name: INBOX_TEXTS.markRead, hidden: true }))
    await waitFor(() => expect(mockMarkNotice).toHaveBeenCalledWith({ id: 'aviso-1', read: true }))

    fireEvent.click(within(panel).getByRole('button', { name: INBOX_TEXTS.markUnread, hidden: true }))
    await waitFor(() => expect(mockMarkNotice).toHaveBeenCalledWith({ id: 'aviso-2', read: false }))
  })

  it('si no se pudo guardar, lo dice en vez de fingir que cambió', async () => {
    mockMarkNotice.mockResolvedValue({ ok: false, error: 'No se pudo guardar el cambio. Intentá de nuevo.' })
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: [unreadNotice], unreadCount: 1 } }} />)
    const panel = openPanel()

    fireEvent.click(within(panel).getByRole('button', { name: INBOX_TEXTS.markRead, hidden: true }))

    expect((await within(panel).findByRole('alert', { hidden: true })).textContent).toBe(
      'No se pudo guardar el cambio. Intentá de nuevo.',
    )
  })

  it('sin avisos muestra el estado vacío y el botón no lleva número', () => {
    render(<AdminInbox inbox={{ ok: true, inbox: { notices: [], unreadCount: 0 } }} />)

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
})
