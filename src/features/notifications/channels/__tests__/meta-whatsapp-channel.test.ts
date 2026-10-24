import { describe, it, expect, vi, afterEach } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { isChannelNotConfigured, isChannelSendFailed } from '../../domain/errors'
import { readMetaWhatsAppConfigFromEnv, metaWhatsAppChannel } from '../meta-whatsapp-channel'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readMetaWhatsAppConfigFromEnv', () => {
  it('es null si falta cualquier variable requerida', () => {
    expect(readMetaWhatsAppConfigFromEnv({})).toBeNull()
    expect(readMetaWhatsAppConfigFromEnv({ META_WHATSAPP_ACCESS_TOKEN: 'token' })).toBeNull()
  })

  it('lee la configuración completa, sin plantilla y en español por defecto', () => {
    expect(readMetaWhatsAppConfigFromEnv({
      META_WHATSAPP_ACCESS_TOKEN: 'token', META_WHATSAPP_PHONE_NUMBER_ID: '123456',
    })).toEqual({ accessToken: 'token', phoneNumberId: '123456', templateName: null, templateLanguage: 'es' })
  })

  it('lee la plantilla y el idioma cuando están presentes', () => {
    const config = readMetaWhatsAppConfigFromEnv({
      META_WHATSAPP_ACCESS_TOKEN: 'token', META_WHATSAPP_PHONE_NUMBER_ID: '123456',
      META_WHATSAPP_TEMPLATE_NAME: 'recordatorio_cita', META_WHATSAPP_TEMPLATE_LANGUAGE: 'es_CR',
    })
    expect(config?.templateName).toBe('recordatorio_cita')
    expect(config?.templateLanguage).toBe('es_CR')
  })
})

describe('metaWhatsAppChannel', () => {
  it('reporta el canal sin configurar cuando no hay credenciales', async () => {
    const result = await metaWhatsAppChannel(null).send({
      reminderId: 'reminder-1',
      contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola', templateVariables: [],
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isChannelNotConfigured(result.error)).toBe(true)
  })

  it('sin plantilla configurada, manda un mensaje de texto libre', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await metaWhatsAppChannel({
      accessToken: 'token', phoneNumberId: '123456', templateName: null, templateLanguage: 'es',
    }).send({ reminderId: 'reminder-1', contact: { phone: '+506 8888-7777', email: 'a@b.com' }, message: 'hola clienta', templateVariables: [] })

    expect(isOk(result)).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v21.0/123456/messages')
    expect(init.headers.Authorization).toBe('Bearer token')
    const body = JSON.parse(init.body)
    expect(body).toEqual({
      messaging_product: 'whatsapp', to: '50688887777', type: 'text', text: { body: 'hola clienta' },
    })
  })

  it('con plantilla configurada, manda las variables en los componentes del mensaje', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await metaWhatsAppChannel({
      accessToken: 'token', phoneNumberId: '123456', templateName: 'recordatorio_cita', templateLanguage: 'es',
    }).send({
      reminderId: 'reminder-1',
      contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola clienta',
      templateVariables: ['Técnica A', 'hoy 3pm'],
    })

    expect(isOk(result)).toBe(true)
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)
    expect(body).toEqual({
      messaging_product: 'whatsapp',
      to: '50688887777',
      type: 'template',
      template: {
        name: 'recordatorio_cita',
        language: { code: 'es' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'Técnica A' }, { type: 'text', text: 'hoy 3pm' }] }],
      },
    })
  })

  it('reporta el fallo con el mensaje de error de Meta cuando la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 400, json: async () => ({ error: { message: 'plantilla no encontrada' } }),
    }))

    const result = await metaWhatsAppChannel({
      accessToken: 'token', phoneNumberId: '123456', templateName: null, templateLanguage: 'es',
    }).send({ reminderId: 'reminder-1', contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola', templateVariables: [] })

    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    if (!isChannelSendFailed(result.error)) throw new Error('se esperaba ChannelSendFailed')
    expect(result.error.cause).toBe('plantilla no encontrada')
  })
})
