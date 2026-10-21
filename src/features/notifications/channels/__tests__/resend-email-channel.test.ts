import { describe, it, expect, vi, afterEach } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { isChannelNotConfigured, isChannelSendFailed } from '../../domain/errors'
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
      contact: { phone: '+50688887777', email: 'a@b.com' }, message: 'hola', templateVariables: [],
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isChannelNotConfigured(result.error)).toBe(true)
  })

  it('envía con Bearer y el destinatario correcto cuando Resend responde ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await resendEmailChannel({
      apiKey: 'key', fromAddress: 'recordatorios@lashary.example', subject: 'Recordatorio',
    }).send({ contact: { phone: '+50688887777', email: 'clienta@example.com' }, message: 'hola', templateVariables: [] })

    expect(isOk(result)).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.headers.Authorization).toBe('Bearer key')
    const body = JSON.parse(init.body)
    expect(body.to).toEqual(['clienta@example.com'])
    expect(body.from).toBe('recordatorios@lashary.example')
  })

  it('reporta el fallo cuando Resend responde con error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))

    const result = await resendEmailChannel({
      apiKey: 'key', fromAddress: 'recordatorios@lashary.example', subject: 'Recordatorio',
    }).send({ contact: { phone: '+50688887777', email: 'clienta@example.com' }, message: 'hola', templateVariables: [] })

    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isChannelSendFailed(result.error)).toBe(true)
  })
})
