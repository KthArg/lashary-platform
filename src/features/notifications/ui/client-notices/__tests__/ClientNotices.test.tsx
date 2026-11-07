import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { buildClientNoticeMessage } from '@/features/notifications/domain/client-notice-message'
import type { ClientNotice } from '@/features/notifications/domain/client-notice'
import { ClientNotices } from '../components/ClientNotices'
import { CLIENT_NOTICES_TEXTS } from '../constants/client-notices-strings'

const rejected: ClientNotice = {
  id: 'aviso-1',
  kind: 'reschedule_rejected',
  appointmentId: 'cita-1',
  serviceName: 'Lifting de pestañas',
  requestedStartsAt: fixedDate('2047-10-14T15:00:00Z'),
  keptStartsAt: fixedDate('2047-10-07T15:00:00Z'),
  createdAt: fixedDate('2047-10-01T18:00:00Z'),
}
const expired: ClientNotice = { ...rejected, id: 'aviso-2', kind: 'reschedule_expired', serviceName: 'Extensiones' }

afterEach(cleanup)

describe('ClientNotices', () => {
  it('muestra cada aviso con el horario que pidió y el que conserva (US-NOT-02, ítem 13)', () => {
    render(<ClientNotices result={{ ok: true, notices: [rejected, expired] }} />)

    const section = screen.getByRole('region', { name: CLIENT_NOTICES_TEXTS.title })
    const items = within(section).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([buildClientNoticeMessage(rejected), buildClientNoticeMessage(expired)])
  })

  it('sin avisos no pinta nada: «Mis citas» se ve como siempre', () => {
    const { container } = render(<ClientNotices result={{ ok: true, notices: [] }} />)
    expect(container.innerHTML).toBe('')
  })

  it('si los avisos no cargaron, lo dice en vez de callarlo (UI-003)', () => {
    render(<ClientNotices result={{ ok: false }} />)
    expect(screen.getByRole('alert').textContent).toBe(CLIENT_NOTICES_TEXTS.loadFailed)
  })
})
