import { createHmac } from 'node:crypto'
import { describe, it, expect } from 'vitest'
import { evaluateCmsWebhook, WEBHOOK_WINDOW_MS, type WebhookInput } from '../webhook'

// Valor de prueba, no una credencial: se arma repitiendo para superar el mínimo de 32 caracteres.
const SECRET = 'prueba-'.repeat(6)
const NOW = 1_800_000_000_000

const sign = (secret: string, ts: string, body: string) =>
  `sha256=${createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')}`

const aviso = (overrides: Partial<WebhookInput> = {}): WebhookInput => {
  const rawBody = JSON.stringify({
    id: 'a1',
    evento: 'content.published',
    ts: NOW,
    claves: [{ key: 'hero', tipo: 'singleton' }],
    tags: ['content:hero', 'content:intro'],
  })
  const timestamp = String(NOW)
  return { rawBody, timestamp, signature: sign(SECRET, timestamp, rawBody), secret: SECRET, now: NOW, ...overrides }
}

describe('evaluateCmsWebhook — aviso al publicar (docs/contracts/cms-api.md § Invalidación)', () => {
  it('aviso firmado y en ventana: acepta los tags de tipos vigentes', () => {
    expect(evaluateCmsWebhook(aviso())).toEqual({ status: 200, tags: ['content:hero', 'content:intro'] })
  })

  it('acepta el tag de la llamada final con su clave del CMS, y no la del código', () => {
    const rawBody = JSON.stringify({ tags: ['content:closing-cta', 'content:closingCta'] })
    const input = aviso({ rawBody, signature: sign(SECRET, String(NOW), rawBody) })
    expect(evaluateCmsWebhook(input)).toEqual({ status: 200, tags: ['content:closing-cta'] })
  })

  it('acepta el tag de la coleccion de fotos: publicarlas renueva la landing', () => {
    const rawBody = JSON.stringify({ tags: ['content:tecnicas'] })
    const input = aviso({ rawBody, signature: sign(SECRET, String(NOW), rawBody) })
    expect(evaluateCmsWebhook(input)).toEqual({ status: 200, tags: ['content:tecnicas'] })
  })

  it('acepta el tag de la galeria: desmarcar un consentimiento y publicar retira el par', () => {
    const rawBody = JSON.stringify({ tags: ['content:galeria'] })
    const input = aviso({ rawBody, signature: sign(SECRET, String(NOW), rawBody) })
    expect(evaluateCmsWebhook(input)).toEqual({ status: 200, tags: ['content:galeria'] })
  })

  it('ignora tags desconocidos, repetidos o que no son texto', () => {
    const rawBody = JSON.stringify({ tags: ['content:hero', 'content:hero', 'settings', 'content:posts', 7] })
    const input = aviso({ rawBody, signature: sign(SECRET, String(NOW), rawBody) })
    expect(evaluateCmsWebhook(input)).toEqual({ status: 200, tags: ['content:hero'] })
  })

  it('cuerpo alterado después de firmar: 401', () => {
    const input = aviso()
    expect(evaluateCmsWebhook({ ...input, rawBody: input.rawBody.replace('hero', 'intro') }).status).toBe(401)
  })

  it('firmado con otro secreto: 401', () => {
    const input = aviso()
    const signature = sign('otra-'.repeat(8), String(NOW), input.rawBody)
    expect(evaluateCmsWebhook({ ...input, signature }).status).toBe(401)
  })

  it('timestamp cambiado sin volver a firmar: 401', () => {
    expect(evaluateCmsWebhook({ ...aviso(), timestamp: String(NOW + 1) }).status).toBe(401)
  })

  it.each([
    ['viejo', NOW - WEBHOOK_WINDOW_MS - 1],
    ['del futuro', NOW + WEBHOOK_WINDOW_MS + 1],
  ])('aviso %s, fuera de la ventana de 5 minutos: 401', (_name, ts) => {
    const input = aviso()
    const timestamp = String(ts)
    expect(evaluateCmsWebhook({ ...input, timestamp, signature: sign(SECRET, timestamp, input.rawBody) }))
      .toEqual({ status: 401, reason: 'aviso fuera de la ventana' })
  })

  it.each([null, 'sha256=zz', 'md5=abc', 'sha256='])('cabecera de firma ausente o mal formada (%s): 401', (signature) => {
    expect(evaluateCmsWebhook({ ...aviso(), signature }).status).toBe(401)
  })

  it('sin secreto configurado, o demasiado corto: 503 y no se verifica nada', () => {
    expect(evaluateCmsWebhook({ ...aviso(), secret: undefined }).status).toBe(503)
    expect(evaluateCmsWebhook({ ...aviso(), secret: 'corto' }).status).toBe(503)
  })

  it('firma válida pero JSON inválido: 400', () => {
    const rawBody = '{no es json'
    expect(evaluateCmsWebhook(aviso({ rawBody, signature: sign(SECRET, String(NOW), rawBody) })).status).toBe(400)
  })
})
