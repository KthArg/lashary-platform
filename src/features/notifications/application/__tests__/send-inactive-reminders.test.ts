import { describe, it, expect, vi } from 'vitest'
import { ok, err, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { channelNotConfigured, channelSendFailed } from '../../domain/errors'
import { MAX_REMINDER_ATTEMPTS } from '../../domain/reminder'
import { INACTIVE_REMINDER_MESSAGE_TEXTS } from '../../domain/inactive-reminder-message'
import type { InactiveReminderDelivery } from '../../domain/inactive-reminder'
import { NO_CONTACT_ERROR, sendInactiveReminders, type SendInactiveRemindersDeps } from '../send-inactive-reminders'
import type { ChannelSendInput, InactiveReminderDeliveryRepository, NotificationChannel } from '../ports'

const NOW = fixedDate('2026-11-22T15:00:00Z')
const BOOKING_URL = 'https://lashary.example/portal/citas'
const UNSUBSCRIBE_URL = 'https://lashary.example/recordatorios/baja/abc'
const SAMPLE_UUID = '3f2b8c1e-9d4a-4c6b-8e2f-1a7b5c9d0e3f'

const DELIVERY: InactiveReminderDelivery = {
  id: '00000000-0000-0000-0000-0000000000d1',
  clientId: '00000000-0000-0000-0000-0000000000c1',
  clientName: 'Ana Rodríguez',
  unsubscribeToken: SAMPLE_UUID,
  attempts: 0,
}

const deliveries = (overrides: Partial<InactiveReminderDeliveryRepository> = {}): InactiveReminderDeliveryRepository => ({
  claimDue: async () => ok([DELIVERY]),
  releaseToPending: vi.fn(async () => ok(undefined)),
  markSent: vi.fn(async () => ok(undefined)),
  markRetry: vi.fn(async () => ok(undefined)),
  markExhausted: vi.fn(async () => ok(undefined)),
  ...overrides,
})

const emailChannel = (send: NotificationChannel['send'] = async () => ok(undefined)): NotificationChannel => ({ kind: 'email', send })

const deps = (overrides: Partial<SendInactiveRemindersDeps> = {}): SendInactiveRemindersDeps => ({
  deliveries: deliveries(),
  getContact: async () => ok({ phone: '+50688887777', email: 'ana@example.com' }),
  channel: emailChannel(),
  bookingUrl: BOOKING_URL,
  unsubscribeUrlFor: () => UNSUBSCRIBE_URL,
  clock: fixedClock('2026-11-22T15:00:00Z'),
  ...overrides,
})

describe('sendInactiveReminders', () => {
  it('manda el mensaje fijo por correo, con el enlace de baja también en el encabezado, y marca la fecha y el canal (criterio 3)', async () => {
    const sent: ChannelSendInput[] = []
    const repo = deliveries()
    const unsubscribeUrlFor = vi.fn(() => UNSUBSCRIBE_URL)

    const result = await sendInactiveReminders(deps({
      deliveries: repo,
      unsubscribeUrlFor,
      channel: emailChannel(async (input) => (sent.push(input), ok(undefined))),
    }))()

    expect(isOk(result) && result.value).toEqual({ sent: 1, retried: 0, exhausted: 0, errored: 0, unconfigured: 0 })
    expect(unsubscribeUrlFor).toHaveBeenCalledWith(DELIVERY.unsubscribeToken)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ messageId: DELIVERY.id, purpose: 'inactive_reminder', unsubscribeUrl: UNSUBSCRIBE_URL })
    expect(sent[0].message).toContain(`${INACTIVE_REMINDER_MESSAGE_TEXTS.greeting} Ana`)
    expect(sent[0].message).toContain(BOOKING_URL)
    expect(sent[0].message).toContain(UNSUBSCRIBE_URL)
    expect(repo.markSent).toHaveBeenCalledWith(DELIVERY.id, 'email', NOW)
  })

  it('sin contacto registrado gasta un intento con el motivo', async () => {
    const repo = deliveries()
    const result = await sendInactiveReminders(deps({ deliveries: repo, getContact: async () => ok(null) }))()
    expect(isOk(result) && result.value.retried).toBe(1)
    expect(repo.markRetry).toHaveBeenCalledWith(DELIVERY.id, 1, NO_CONTACT_ERROR)
  })

  it('si el correo falla, reintenta en la próxima corrida', async () => {
    const repo = deliveries()
    const result = await sendInactiveReminders(deps({
      deliveries: repo,
      channel: emailChannel(async () => err(channelSendFailed('email', 'Resend respondió 500'))),
    }))()
    expect(isOk(result) && result.value.retried).toBe(1)
    expect(repo.markRetry).toHaveBeenCalledWith(DELIVERY.id, 1, expect.stringContaining('Resend respondió 500'))
  })

  it('agotados los intentos queda fallido', async () => {
    const repo = deliveries({ claimDue: async () => ok([{ ...DELIVERY, attempts: MAX_REMINDER_ATTEMPTS - 1 }]) })
    const result = await sendInactiveReminders(deps({
      deliveries: repo,
      channel: emailChannel(async () => err(channelSendFailed('email', 'rebotó'))),
    }))()
    expect(isOk(result) && result.value.exhausted).toBe(1)
    expect(repo.markExhausted).toHaveBeenCalledWith(DELIVERY.id, MAX_REMINDER_ATTEMPTS, expect.any(String))
  })

  it('sin el correo configurado no gasta intentos: lo devuelve a la cola', async () => {
    const repo = deliveries()
    const result = await sendInactiveReminders(deps({
      deliveries: repo,
      channel: emailChannel(async () => err(channelNotConfigured('email'))),
    }))()
    expect(isOk(result) && result.value.unconfigured).toBe(1)
    expect(repo.releaseToPending).toHaveBeenCalledWith(DELIVERY.id)
    expect(repo.markRetry).not.toHaveBeenCalled()
  })

  it('sin enlace de baja no manda: el mensaje siempre lo lleva (criterio 4)', async () => {
    const send = vi.fn(async () => ok(undefined))
    const repo = deliveries()
    const result = await sendInactiveReminders(deps({ deliveries: repo, unsubscribeUrlFor: () => null, channel: emailChannel(send) }))()
    expect(send).not.toHaveBeenCalled()
    expect(isOk(result) && result.value.unconfigured).toBe(1)
    expect(repo.releaseToPending).toHaveBeenCalledWith(DELIVERY.id)
  })

  it('si no puede leer el contacto, lo libera sin gastar un intento', async () => {
    const repo = deliveries()
    const result = await sendInactiveReminders(deps({ deliveries: repo, getContact: async () => err('repository-failed') }))()
    expect(isOk(result) && result.value.errored).toBe(1)
    expect(repo.releaseToPending).toHaveBeenCalledWith(DELIVERY.id)
  })

  it('un fallo al reclamar se devuelve tal cual', async () => {
    const result = await sendInactiveReminders(deps({ deliveries: deliveries({ claimDue: async () => err('repository-failed') }) }))()
    expect(result).toEqual({ ok: false, error: 'repository-failed' })
  })
})
