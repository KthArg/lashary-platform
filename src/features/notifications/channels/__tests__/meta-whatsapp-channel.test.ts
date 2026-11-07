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
    })).toEqual({ accessToken: 'token', phoneNumberId: '123456', templateName: null, confirmationTemplateName: null, templateLanguage: 'es', graphApiVersion: 'v21.0' })
  })

  it('lee la plantilla y el idioma cuando están presentes', () => {
    const config = readMetaWhatsAppConfigFromEnv({
      META_WHATSAPP_ACCESS_TOKEN: 'token', META_WHATSAPP_PHONE_NUMBER_ID: '123456',
      META_WHATSAPP_TEMPLATE_NAME: 'recordatorio_cita', META_WHATSAPP_TEMPLATE_LANGUAGE: 'es_CR',
    })
    expect(config?.templateName).toBe('recordatorio_cita')
    expect(config?.templateLanguage).toBe('es_CR')
  })

  it('lee una versión de la Graph API distinta de la por defecto cuando está presente (B7)', () => {
    const config = readMetaWhatsAppConfigFromEnv({
      META_WHATSAPP_ACCESS_TOKEN: 'token', META_WHATSAPP_PHONE_NUMBER_ID: '123456',
      META_WHATSAPP_GRAPH_API_VERSION: 'v22.0',
    })
    expect(config?.graphApiVersion).toBe('v22.0')
  })
})

describe('metaWhatsAppChannel', () => {
  it('reporta el canal sin configurar cuando no hay credenciales', async () => {
    const result = await metaWhatsAppChannel(null).send({
      messageId: 'rem-1', purpose: 'reminder', contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola', templateVariables: [],
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isChannelNotConfigured(result.error)).toBe(true)
  })

  it('sin plantilla configurada, manda un mensaje de texto libre', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await metaWhatsAppChannel({
      accessToken: 'token', phoneNumberId: '123456', templateName: null, confirmationTemplateName: null, templateLanguage: 'es', graphApiVersion: 'v21.0',
    }).send({ messageId: 'rem-1', purpose: 'reminder', contact: { phone: '+506 8888-7777', email: 'a@b.com' }, message: 'hola clienta', templateVariables: [] })

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
      accessToken: 'token', phoneNumberId: '123456', templateName: 'recordatorio_cita', confirmationTemplateName: null, templateLanguage: 'es', graphApiVersion: 'v21.0',
    }).send({
      messageId: 'rem-1', purpose: 'reminder', contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola clienta',
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
      accessToken: 'token', phoneNumberId: '123456', templateName: null, confirmationTemplateName: null, templateLanguage: 'es', graphApiVersion: 'v21.0',
    }).send({ messageId: 'rem-1', purpose: 'reminder', contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola', templateVariables: [] })

    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    if (!isChannelSendFailed(result.error)) throw new Error('se esperaba ChannelSendFailed')
    expect(result.error.cause).toBe('plantilla no encontrada')
  })

  it('una confirmación usa su propia plantilla (US-NOT-08)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await metaWhatsAppChannel({
      accessToken: 'token', phoneNumberId: '123456', templateName: 'recordatorio_cita',
      confirmationTemplateName: 'confirmar_cita', templateLanguage: 'es', graphApiVersion: 'v21.0',
    }).send({
      messageId: 'sol-1', purpose: 'appointment_confirmation', contact: { phone: '+50688887777', email: 'a@b.com' },
      message: 'confirmá', templateVariables: ['Lifting', 'martes 9:00', 'https://lashary.example'],
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.template.name).toBe('confirmar_cita')
    expect(body.template.components[0].parameters).toHaveLength(3)
  })

  it('con plantillas en uso pero sin la de confirmación, no manda texto libre', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await metaWhatsAppChannel({
      accessToken: 'token', phoneNumberId: '123456', templateName: 'recordatorio_cita',
      confirmationTemplateName: null, templateLanguage: 'es', graphApiVersion: 'v21.0',
    }).send({
      messageId: 'sol-1', purpose: 'appointment_confirmation', contact: { phone: '+50688887777', email: 'a@b.com' },
      message: 'confirmá', templateVariables: [],
    })

    expect(isErr(result) && isChannelNotConfigured(result.error)).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
