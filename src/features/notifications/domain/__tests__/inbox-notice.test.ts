import { describe, it, expect } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { isUnread, type InboxNotice } from '../inbox-notice'

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

describe('isUnread', () => {
  it('un aviso sin fecha de lectura está sin leer, y uno con fecha ya se leyó (criterio 3)', () => {
    expect(isUnread(notice)).toBe(true)
    expect(isUnread({ ...notice, readAt: fixedDate('2026-10-29T19:00:00Z') })).toBe(false)
  })
})
