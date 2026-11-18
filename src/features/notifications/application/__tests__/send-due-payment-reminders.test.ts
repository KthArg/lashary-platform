import { describe, it, expect } from 'vitest'
import { ok, err, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { sendDuePaymentReminders, type SendDuePaymentRemindersDeps } from '../send-due-payment-reminders'
import { channelNotConfigured, channelSendFailed } from '../../domain/errors'
import { paymentReminderKey } from '../../domain/payment-reminder'
import type { ChannelSendInput, ContactInfo, DuePaymentReminder, NotificationChannel, PaymentReminderSentInput } from '../ports'

const CONTACT: ContactInfo = { phone: '+50688887777', email: 'clienta@example.com' }
const NOW_ISO = '2026-11-17T12:00:00Z'
const NOW = fixedDate(NOW_ISO)

const due: DuePaymentReminder = { clientId: 'client-1', amountOwed: 18000 }

type ChannelOutcome = 'ok' | 'send-failed' | 'not-configured'

function fakeChannel(kind: 'whatsapp' | 'email', outcome: ChannelOutcome, received: ChannelSendInput[] = []): NotificationChannel {
  return {
    kind,
    send: async (input) => {
      received.push(input)
      if (outcome === 'ok') return ok(undefined)
      if (outcome === 'not-configured') return err(channelNotConfigured(kind))
      return err(channelSendFailed(kind, 'fallo simulado'))
    },
  }
}

function buildDeps(options: {
  hasContact?: boolean
  contactReadFails?: boolean
  recordFails?: boolean
  primary?: ChannelOutcome
  backup?: ChannelOutcome
} = {}) {
  const recorded: PaymentReminderSentInput[] = []
  const primaryReceived: ChannelSendInput[] = []
  const deps: SendDuePaymentRemindersDeps = {
    recordSent: async (input) => {
      if (options.recordFails) return err('repository-failed' as const)
      recorded.push(input)
      return ok(undefined)
    },
    getContact: async () => {
      if (options.contactReadFails) return err('repository-failed' as const)
      return ok(options.hasContact === false ? null : CONTACT)
    },
    primaryChannel: fakeChannel('whatsapp', options.primary ?? 'ok', primaryReceived),
    backupChannel: fakeChannel('email', options.backup ?? 'ok'),
    clock: fixedClock(NOW_ISO),
  }
  return { deps, recorded, primaryReceived }
}

describe('sendDuePaymentReminders', () => {
  it('sin recordatorios por enviar no hace nada', async () => {
    const { deps, recorded } = buildDeps()

    const result = await sendDuePaymentReminders(deps)([])

    expect(isOk(result) && result.value).toEqual({ sent: 0, skipped: 0, failed: 0, errored: 0 })
    expect(recorded).toEqual([])
  })

  it('envía por el canal primario con el monto y deja registrado el envío (criterios 1 y 2)', async () => {
    const { deps, recorded, primaryReceived } = buildDeps()

    const result = await sendDuePaymentReminders(deps)([due])

    expect(isOk(result) && result.value.sent).toBe(1)
    expect(primaryReceived[0]?.purpose).toBe('payment_reminder')
    expect(primaryReceived[0]?.message).toContain(formatMoney(moneyFromColones(18000)))
    expect(primaryReceived[0]?.templateVariables).toEqual([formatMoney(moneyFromColones(18000))])
    expect(primaryReceived[0]?.messageId).toBe(paymentReminderKey('client-1', NOW))
    expect(recorded).toEqual([{ clientId: 'client-1', amountOwed: 18000, channel: 'whatsapp', sentAt: NOW }])
  })

  it('si el canal primario falla, el correo de respaldo lo rescata y se registra con el canal que lo envió', async () => {
    const { deps, recorded } = buildDeps({ primary: 'send-failed' })

    const result = await sendDuePaymentReminders(deps)([due])

    expect(isOk(result) && result.value.sent).toBe(1)
    expect(recorded[0]?.channel).toBe('email')
  })

  it('si el primario no está configurado y el correo sí, sale por correo', async () => {
    const { deps, recorded } = buildDeps({ primary: 'not-configured' })

    await sendDuePaymentReminders(deps)([due])

    expect(recorded[0]?.channel).toBe('email')
  })

  it('si fallan los dos canales no registra el envío: se reintenta en la siguiente corrida', async () => {
    const { deps, recorded } = buildDeps({ primary: 'send-failed', backup: 'send-failed' })

    const result = await sendDuePaymentReminders(deps)([due])

    expect(isOk(result) && result.value).toEqual({ sent: 0, skipped: 0, failed: 1, errored: 0 })
    expect(recorded).toEqual([])
  })

  it('con los dos canales sin configurar la omite sin registrar nada', async () => {
    const { deps, recorded } = buildDeps({ primary: 'not-configured', backup: 'not-configured' })

    const result = await sendDuePaymentReminders(deps)([due])

    expect(isOk(result) && result.value.skipped).toBe(1)
    expect(recorded).toEqual([])
  })

  it('una clienta sin contacto se omite', async () => {
    const { deps, recorded } = buildDeps({ hasContact: false })

    const result = await sendDuePaymentReminders(deps)([due])

    expect(isOk(result) && result.value.skipped).toBe(1)
    expect(recorded).toEqual([])
  })

  it('si no se puede leer el contacto, cuenta el error y sigue con las demás', async () => {
    const { deps } = buildDeps({ contactReadFails: true })

    const result = await sendDuePaymentReminders(deps)([due, { clientId: 'client-2', amountOwed: 5000 }])

    expect(isOk(result) && result.value.errored).toBe(2)
  })

  it('si el mensaje salió pero no se pudo registrar, lo cuenta como error', async () => {
    const { deps } = buildDeps({ recordFails: true })

    const result = await sendDuePaymentReminders(deps)([due])

    expect(isOk(result) && result.value).toEqual({ sent: 0, skipped: 0, failed: 0, errored: 1 })
  })
})
