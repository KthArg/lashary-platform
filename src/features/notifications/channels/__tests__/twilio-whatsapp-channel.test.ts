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

  it('lee la configuración completa', () => {
    expect(readTwilioWhatsAppConfigFromEnv({
      TWILIO_ACCOUNT_SID: 'sid', TWILIO_AUTH_TOKEN: 'token', TWILIO_WHATSAPP_FROM: '+14155238886',
    })).toEqual({ accountSid: 'sid', authToken: 'token', fromWhatsAppNumber: '+14155238886' })
  })
})

describe('twilioWhatsAppChannel', () => {
  it('reporta el canal sin configurar cuando no hay credenciales', async () => {
    const result = await twilioWhatsAppChannel(null).send({
      contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola',
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isChannelNotConfigured(result.error)).toBe(true)
  })

  it('envía con Basic Auth y el número en formato whatsapp: cuando Twilio responde ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await twilioWhatsAppChannel({
      accountSid: 'sid', authToken: 'token', fromWhatsAppNumber: '+14155238886',
    }).send({ contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola' })

    expect(isOk(result)).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/sid/Messages.json')
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('sid:token').toString('base64')}`)
    expect(init.body.get('To')).toBe('whatsapp:+50688887777')
    expect(init.body.get('From')).toBe('whatsapp:+14155238886')
  })

  it('reporta el fallo cuando Twilio responde con error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }))

    const result = await twilioWhatsAppChannel({
      accountSid: 'sid', authToken: 'token', fromWhatsAppNumber: '+14155238886',
    }).send({ contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola' })

    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isChannelSendFailed(result.error)).toBe(true)
  })
})
