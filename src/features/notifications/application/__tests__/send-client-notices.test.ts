import { describe, it, expect } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { channelNotConfigured, channelSendFailed } from '../../domain/errors'
import { CLIENT_NOTICE_MAX_ATTEMPTS, type ClientNoticeDelivery } from '../../domain/client-notice'
import { buildClientNoticeMessage, buildClientNoticeTemplateVariables } from '../../domain/client-notice-message'
import { sendClientNotices } from '../send-client-notices'
import type { ChannelSendInput, ClientContactPort, ClientNoticeDeliveryRepository, ContactInfo, NotificationChannel } from '../ports'

const NOW = '2047-10-01T12:00:00Z'
const contact: ContactInfo = { phone: '+50688887777', email: 'clienta@example.com' }
const notice: ClientNoticeDelivery = {
  id: 'aviso-1',
  kind: 'reschedule_rejected',
  clientId: 'clienta-1',
  serviceName: 'Lifting de pestañas',
  requestedStartsAt: fixedDate('2047-10-14T15:00:00Z'),
  keptStartsAt: fixedDate('2047-10-07T15:00:00Z'),
  attempts: 0,
}

function fakeRepository(due: ClientNoticeDelivery[]) {
  const calls: unknown[][] = []
  const repository: ClientNoticeDeliveryRepository = {
    claimDue: async (now) => (calls.push(['claimDue', now]), ok(due)),
    releaseToPending: async (id) => (calls.push(['releaseToPending', id]), ok(undefined)),
    markSent: async (id, channel) => (calls.push(['markSent', id, channel]), ok(undefined)),
    markRetry: async (id, attempts, error) => (calls.push(['markRetry', id, attempts, error]), ok(undefined)),
    markExhausted: async (id, attempts, error) => (calls.push(['markExhausted', id, attempts, error]), ok(undefined)),
  }
  return { repository, calls }
}

function fakeChannel(kind: 'whatsapp' | 'email', outcome: 'ok' | 'failed' | 'unconfigured') {
  const sent: ChannelSendInput[] = []
  const channel: NotificationChannel = {
    kind,
    async send(input) {
      sent.push(input)
      if (outcome === 'ok') return ok(undefined)
      return err(outcome === 'failed' ? channelSendFailed(kind, 'no respondió') : channelNotConfigured(kind))
    },
  }
  return { channel, sent }
}

const run = (deps: {
  repository: ClientNoticeDeliveryRepository
  primary: NotificationChannel
  backup: NotificationChannel
  getContact?: ClientContactPort['getContact']
}) =>
  sendClientNotices({
    clientNotices: deps.repository,
    getContact: deps.getContact ?? (async () => ok(contact)),
    primaryChannel: deps.primary,
    backupChannel: deps.backup,
    clock: fixedClock(NOW),
  })()

describe('sendClientNotices', () => {
  it('manda el aviso por WhatsApp con su tipo, su texto y sus variables, y lo marca enviado (US-NOT-02, ítem 13)', async () => {
    const { repository, calls } = fakeRepository([notice])
    const whatsapp = fakeChannel('whatsapp', 'ok')
    const email = fakeChannel('email', 'ok')

    const result = await run({ repository, primary: whatsapp.channel, backup: email.channel })

    expect(isOk(result) && result.value).toEqual({ sent: 1, retried: 0, exhausted: 0, errored: 0 })
    expect(whatsapp.sent).toEqual([{
      messageId: 'aviso-1',
      purpose: 'reschedule_outcome',
      contact,
      message: buildClientNoticeMessage(notice),
      templateVariables: buildClientNoticeTemplateVariables(notice),
    }])
    expect(email.sent).toEqual([])
    expect(calls).toEqual([['claimDue', fixedDate(NOW)], ['markSent', 'aviso-1', 'whatsapp']])
  })

  it('si WhatsApp falla, lo manda por correo', async () => {
    const { repository, calls } = fakeRepository([notice])

    const result = await run({ repository, primary: fakeChannel('whatsapp', 'failed').channel, backup: fakeChannel('email', 'ok').channel })

    expect(isOk(result) && result.value.sent).toBe(1)
    expect(calls.at(-1)).toEqual(['markSent', 'aviso-1', 'email'])
  })

  it('si fallan los dos canales, vuelve a la fila con el intento contado y el motivo', async () => {
    const { repository, calls } = fakeRepository([notice])

    const result = await run({ repository, primary: fakeChannel('whatsapp', 'failed').channel, backup: fakeChannel('email', 'failed').channel })

    expect(isOk(result) && result.value.retried).toBe(1)
    expect(calls.at(-1)?.slice(0, 3)).toEqual(['markRetry', 'aviso-1', 1])
  })

  it('en el último intento, o sin ningún canal configurado, queda agotado en vez de reintentar para siempre', async () => {
    const last = { ...notice, id: 'aviso-2', attempts: CLIENT_NOTICE_MAX_ATTEMPTS - 1 }
    const failing = fakeRepository([last])
    await run({ repository: failing.repository, primary: fakeChannel('whatsapp', 'failed').channel, backup: fakeChannel('email', 'failed').channel })
    expect(failing.calls.at(-1)?.slice(0, 3)).toEqual(['markExhausted', 'aviso-2', CLIENT_NOTICE_MAX_ATTEMPTS])

    const unconfigured = fakeRepository([notice])
    await run({ repository: unconfigured.repository, primary: fakeChannel('whatsapp', 'unconfigured').channel, backup: fakeChannel('email', 'unconfigured').channel })
    expect(unconfigured.calls.at(-1)?.slice(0, 3)).toEqual(['markExhausted', 'aviso-1', 1])
  })

  it('una clienta sin contacto cuenta como intento fallido, sin mandar nada', async () => {
    const { repository, calls } = fakeRepository([notice])
    const whatsapp = fakeChannel('whatsapp', 'ok')

    await run({ repository, primary: whatsapp.channel, backup: fakeChannel('email', 'ok').channel, getContact: async () => ok(null) })

    expect(whatsapp.sent).toEqual([])
    expect(calls.at(-1)).toEqual(['markRetry', 'aviso-1', 1, 'sin contacto registrado para la clienta'])
  })

  it('si no se pudo leer el contacto, suelta el aviso para la corrida siguiente sin gastar un intento', async () => {
    const { repository, calls } = fakeRepository([notice])

    const result = await run({
      repository, primary: fakeChannel('whatsapp', 'ok').channel, backup: fakeChannel('email', 'ok').channel,
      getContact: async () => err('repository-failed'),
    })

    expect(isOk(result) && result.value.errored).toBe(1)
    expect(calls.at(-1)).toEqual(['releaseToPending', 'aviso-1'])
  })

  it('si no se pudo reclamar, lo informa como error en vez de decir que no había avisos', async () => {
    const repository: ClientNoticeDeliveryRepository = { ...fakeRepository([]).repository, claimDue: async () => err('repository-failed') }
    const result = await run({ repository, primary: fakeChannel('whatsapp', 'ok').channel, backup: fakeChannel('email', 'ok').channel })
    expect(isErr(result)).toBe(true)
  })
})
