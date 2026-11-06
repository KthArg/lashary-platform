import { describe, it, expect } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { formatStudioDateTime } from '@/shared/studio-time'
import { buildClientNoticeMessage, CLIENT_NOTICE_MESSAGE_TEXTS } from '../client-notice-message'

const notice = {
  kind: 'reschedule_rejected' as const,
  serviceName: 'Lifting de pestañas',
  requestedStartsAt: fixedDate('2047-10-14T15:00:00Z'),
  keptStartsAt: fixedDate('2047-10-07T15:00:00Z'),
}
const requested = formatStudioDateTime(notice.requestedStartsAt)
const kept = formatStudioDateTime(notice.keptStartsAt)

describe('buildClientNoticeMessage', () => {
  it('un cambio rechazado dice qué pidió y el horario que conserva (US-NOT-02, ítem 13)', () => {
    expect(buildClientNoticeMessage(notice)).toBe(CLIENT_NOTICE_MESSAGE_TEXTS.rejected('Lifting de pestañas', requested, kept))
  })

  it('un cambio vencido dice que venció sin respuesta, no que se lo rechazaron', () => {
    const message = buildClientNoticeMessage({ ...notice, kind: 'reschedule_expired' })
    expect(message).toBe(CLIENT_NOTICE_MESSAGE_TEXTS.expired('Lifting de pestañas', requested, kept))
    expect(message).not.toContain('no aceptó')
  })

  it('nunca deja un punto doble: la hora del estudio ya termina en «a. m.» o «p. m.»', () => {
    for (const kind of ['reschedule_rejected', 'reschedule_expired'] as const) {
      expect(buildClientNoticeMessage({ ...notice, kind })).not.toContain('..')
    }
  })
})
