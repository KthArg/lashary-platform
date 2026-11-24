import { describe, expect, it } from 'vitest'
import {
  INACTIVE_REMINDER_MESSAGE_TEXTS,
  INACTIVE_UNSUBSCRIBE_PATH,
  buildInactiveReminderMessage,
  buildInactiveUnsubscribeUrl,
} from '../inactive-reminder-message'

const SAMPLE_UUID = '3f2b8c1e-9d4a-4c6b-8e2f-1a7b5c9d0e3f'
const INPUT = {
  clientName: 'Ana María Rodríguez',
  bookingUrl: 'https://lashary.example/portal/citas',
  unsubscribeUrl: `https://lashary.example${INACTIVE_UNSUBSCRIBE_PATH}/${SAMPLE_UUID}`,
}

describe('buildInactiveReminderMessage', () => {
  it('es un mensaje fijo: saludo con el primer nombre, invitación, enlace para agendar y enlace de baja', () => {
    expect(buildInactiveReminderMessage(INPUT)).toBe(
      [
        `${INACTIVE_REMINDER_MESSAGE_TEXTS.greeting} Ana, ${INACTIVE_REMINDER_MESSAGE_TEXTS.intro}`,
        `${INACTIVE_REMINDER_MESSAGE_TEXTS.callToAction} ${INPUT.bookingUrl}`,
        `${INACTIVE_REMINDER_MESSAGE_TEXTS.unsubscribe} ${INPUT.unsubscribeUrl}`,
      ].join('\n'),
    )
  })

  it('siempre lleva el enlace de baja (criterio 4)', () => {
    expect(buildInactiveReminderMessage(INPUT)).toContain(INPUT.unsubscribeUrl)
  })

  it('sin nombre, el saludo no deja un hueco', () => {
    const message = buildInactiveReminderMessage({ ...INPUT, clientName: '   ' })
    expect(message.startsWith(`${INACTIVE_REMINDER_MESSAGE_TEXTS.greeting}, ${INACTIVE_REMINDER_MESSAGE_TEXTS.intro}`)).toBe(true)
  })

  it('tiene asunto propio para el correo', () => {
    expect(INACTIVE_REMINDER_MESSAGE_TEXTS.emailSubject.length).toBeGreaterThan(0)
  })
})

describe('buildInactiveUnsubscribeUrl', () => {
  it('une el sitio con la ruta de baja y el token', () => {
    expect(buildInactiveUnsubscribeUrl('https://lashary.example/', SAMPLE_UUID)).toBe(`https://lashary.example${INACTIVE_UNSUBSCRIBE_PATH}/${SAMPLE_UUID}`)
  })

  it.each(['', 'no-es-un-token', '../admin', `${SAMPLE_UUID}/../../admin`])('un token que no es un uuid (%s) no da enlace', (token) => {
    expect(buildInactiveUnsubscribeUrl('https://lashary.example', token)).toBeNull()
  })

  it.each([undefined, '', 'ftp://lashary.example'])('sin un sitio absoluto http(s) (%s) no hay enlace', (siteUrl) => {
    expect(buildInactiveUnsubscribeUrl(siteUrl, SAMPLE_UUID)).toBeNull()
  })
})
