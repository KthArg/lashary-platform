import { describe, it, expect, vi, afterEach } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { isChannelNotConfigured, isChannelSendFailed } from '../../domain/errors'
import { readTwilioWhatsAppConfigFromEnv, twilioWhatsAppChannel } from '../twilio-whatsapp-channel'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readTwilioWhatsAppConfigFromEnv', () => {
  it('es null si falta cualquier variable', () => {
    expect(readTwilioWhatsAppConfigFromEnv({})).toBeNull()
  })

  it('lee la configuración completa, sin plantilla por defecto', () => {
    expect(readTwilioWhatsAppConfigFromEnv({
      TWILIO_ACCOUNT_SID: 'sid', TWILIO_AUTH_TOKEN: 'token', TWILIO_WHATSAPP_FROM: '+14155238886',
    })).toEqual({ accountSid: 'sid', authToken: 'token', fromWhatsAppNumber: '+14155238886', contentSid: null })
  })

  it('lee TWILIO_CONTENT_SID cuando está presente', () => {
    const config = readTwilioWhatsAppConfigFromEnv({
      TWILIO_ACCOUNT_SID: 'sid', TWILIO_AUTH_TOKEN: 'token', TWILIO_WHATSAPP_FROM: '+14155238886',
      TWILIO_CONTENT_SID: 'HXabc123',
    })
    expect(config?.contentSid).toBe('HXabc123')
  })
})

describe('twilioWhatsAppChannel', () => {
  it('reporta el canal sin configurar cuando no hay credenciales', async () => {
    const result = await twilioWhatsAppChannel(null).send({
      contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola', templateVariables: [],
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isChannelNotConfigured(result.error)).toBe(true)
  })

  it('sin plantilla configurada, envía Body como texto libre', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await twilioWhatsAppChannel({
      accountSid: 'sid', authToken: 'token', fromWhatsAppNumber: '+14155238886', contentSid: null,
    }).send({ contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola', templateVariables: ['Técnica A', 'hoy 3pm'] })

    expect(isOk(result)).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/sid/Messages.json')
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('sid:token').toString('base64')}`)
    expect(init.body.get('To')).toBe('whatsapp:+50688887777')
    expect(init.body.get('From')).toBe('whatsapp:+14155238886')
    expect(init.body.get('Body')).toBe('hola')
    expect(init.body.get('ContentSid')).toBeNull()
  })

  it('con plantilla configurada, envía ContentSid y ContentVariables en vez de Body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await twilioWhatsAppChannel({
      accountSid: 'sid', authToken: 'token', fromWhatsAppNumber: '+14155238886', contentSid: 'HXabc123',
    }).send({ contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola', templateVariables: ['Técnica A', 'hoy 3pm'] })

    expect(isOk(result)).toBe(true)
    const [, init] = fetchMock.mock.calls[0]
    expect(init.body.get('ContentSid')).toBe('HXabc123')
    expect(init.body.get('ContentVariables')).toBe(JSON.stringify({ '1': 'Técnica A', '2': 'hoy 3pm' }))
    expect(init.body.get('Body')).toBeNull()
  })

  it('reporta el fallo cuando Twilio responde con error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }))

    const result = await twilioWhatsAppChannel({
      accountSid: 'sid', authToken: 'token', fromWhatsAppNumber: '+14155238886', contentSid: null,
    }).send({ contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola', templateVariables: [] })

    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isChannelSendFailed(result.error)).toBe(true)
  })
})
