import { describe, it, expect, vi, afterEach } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { isChannelNotConfigured, isChannelSendFailed } from '../../domain/errors'
import { REMINDER_MESSAGE_TEXTS } from '../../domain/reminder-message'
import { CLIENT_NOTICE_MESSAGE_TEXTS } from '../../domain/client-notice-message'
import { readResendEmailConfigFromEnv, resendEmailChannel } from '../resend-email-channel'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readResendEmailConfigFromEnv', () => {
  it('es null si falta cualquier variable', () => {
    expect(readResendEmailConfigFromEnv({})).toBeNull()
  })
})

describe('resendEmailChannel', () => {
  it('reporta el canal sin configurar cuando no hay credenciales', async () => {
    const result = await resendEmailChannel(null).send({
      messageId: 'rem-1', purpose: 'reminder', contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola', templateVariables: [],
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isChannelNotConfigured(result.error)).toBe(true)
  })

  it('envía con Bearer y el destinatario correcto cuando Resend responde ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await resendEmailChannel({
      apiKey: 'key', fromAddress: 'recordatorios@lashary.example',
    }).send({ messageId: 'rem-1', purpose: 'reminder', contact: { phone: '+50688887777', email: 'clienta@example.com' }, message: 'hola', templateVariables: [] })

    expect(isOk(result)).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer key')
    const body = JSON.parse(init.body)
    expect(body.to).toEqual(['clienta@example.com'])
    expect(body.from).toBe('recordatorios@lashary.example')
    expect(init.headers['Idempotency-Key']).toBe('notifications-reminder-rem-1')
    expect(body.subject).toBe(REMINDER_MESSAGE_TEXTS.emailSubject)
  })

  it('reporta el fallo cuando Resend responde con error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))

    const result = await resendEmailChannel({
      apiKey: 'key', fromAddress: 'recordatorios@lashary.example',
    }).send({ messageId: 'rem-1', purpose: 'reminder', contact: { phone: '+50688887777', email: 'clienta@example.com' }, message: 'hola', templateVariables: [] })

    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isChannelSendFailed(result.error)).toBe(true)
  })

  it('un aviso de cambio va con su propio asunto y su propia clave de idempotencia (US-NOT-02, ítem 13)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await resendEmailChannel({ apiKey: 'key', fromAddress: 'avisos@lashary.example' }).send({
      messageId: 'aviso-1', purpose: 'reschedule_outcome', contact: { phone: '+50688887777', email: 'clienta@example.com' },
      message: 'tu cita sigue', templateVariables: [],
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body).subject).toBe(CLIENT_NOTICE_MESSAGE_TEXTS.emailSubject)
    expect(init.headers['Idempotency-Key']).toBe('notifications-reschedule_outcome-aviso-1')
  })

  it('una confirmación va con su propio asunto y su propia clave de idempotencia (US-NOT-08)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await resendEmailChannel({ apiKey: 'key', fromAddress: 'avisos@lashary.example' }).send({
      messageId: 'sol-1', purpose: 'appointment_confirmation', contact: { phone: '+50688887777', email: 'clienta@example.com' },
      message: 'confirmá', templateVariables: [],
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body).subject).toBe('Confirmá tu cita en LASHARY')
    expect(init.headers['Idempotency-Key']).toBe('notifications-appointment_confirmation-sol-1')
  })
})
