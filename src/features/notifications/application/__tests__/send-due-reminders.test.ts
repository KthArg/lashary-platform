import { describe, it, expect } from 'vitest'
import { ok, err, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { sendDueReminders } from '../send-due-reminders'
import { channelSendFailed } from '../../domain/errors'
import { MAX_REMINDER_ATTEMPTS, type ReminderSnapshot } from '../../domain/reminder'
import type { ContactInfo, NotificationChannel } from '../ports'

const dueReminder: ReminderSnapshot = {
  id: 'rem-1', appointmentId: 'appt-1', clientId: 'client-1',
  startsAt: fixedDate('2026-11-02T15:00:00Z'), techniqueName: 'Técnica A',
  sendAt: fixedDate('2026-11-01T15:00:00Z'), status: 'pending',
  attempts: 0, lastError: null, lastChannel: null, sentAt: null,
}

const contact: ContactInfo = { phone: '+50688887777', email: 'clienta@example.com' }

function fakeChannel(kind: 'whatsapp' | 'email', succeed: boolean): NotificationChannel {
  return {
    kind,
    send: async () => (succeed ? ok(undefined) : err(channelSendFailed(kind, 'fallo simulado'))),
  }
}

function buildDeps(options: {
  reminder?: ReminderSnapshot
  hasContact?: boolean
  primaryOk?: boolean
  backupOk?: boolean
}) {
  const reminder = options.reminder ?? dueReminder
  const sentCalls: unknown[] = []
  const retryCalls: unknown[] = []
  const exhaustedCalls: unknown[] = []
  return {
    deps: {
      listDuePending: async () => ok([reminder]),
      getContact: async () => ok(options.hasContact === false ? null : contact),
      markSent: async (id: string, channel: string, sentAt: Date) => {
        sentCalls.push({ id, channel, sentAt })
        return ok(undefined)
      },
      markRetry: async (id: string, attempts: number, error: string) => {
        retryCalls.push({ id, attempts, error })
        return ok(undefined)
      },
      markExhausted: async (id: string, attempts: number, error: string) => {
        exhaustedCalls.push({ id, error })
        return ok(undefined)
      },
      primaryChannel: fakeChannel('whatsapp', options.primaryOk ?? true),
      backupChannel: fakeChannel('email', options.backupOk ?? true),
      clock: fixedClock('2026-11-01T15:00:01Z'),
    },
    sentCalls, retryCalls, exhaustedCalls,
  }
}

describe('sendDueReminders', () => {
  it('envía por el canal primario (WhatsApp) cuando funciona', async () => {
    const { deps, sentCalls } = buildDeps({})

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 1, retried: 0, exhausted: 0 })
    expect(sentCalls).toEqual([{ id: 'rem-1', channel: 'whatsapp', sentAt: fixedDate('2026-11-01T15:00:01Z') }])
  })

  it('cae al respaldo (email) si el canal primario falla (ADR-0006)', async () => {
    const { deps, sentCalls } = buildDeps({ primaryOk: false })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 1, retried: 0, exhausted: 0 })
    expect(sentCalls).toEqual([{ id: 'rem-1', channel: 'email', sentAt: fixedDate('2026-11-01T15:00:01Z') }])
  })

  it('registra el fallo para reintentar cuando ambos canales fallan y quedan intentos (criterio 4)', async () => {
    const { deps, retryCalls, exhaustedCalls } = buildDeps({ primaryOk: false, backupOk: false })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 0, retried: 1, exhausted: 0 })
    expect(retryCalls).toHaveLength(1)
    expect(exhaustedCalls).toHaveLength(0)
  })

  it('deja de reintentar y queda failed al agotar el máximo de intentos', async () => {
    const atMax = { ...dueReminder, attempts: MAX_REMINDER_ATTEMPTS - 1 }
    const { deps, retryCalls, exhaustedCalls } = buildDeps({ reminder: atMax, primaryOk: false, backupOk: false })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 0, retried: 0, exhausted: 1 })
    expect(exhaustedCalls).toHaveLength(1)
    expect(retryCalls).toHaveLength(0)
  })

  it('registra el fallo si no hay contacto para la clienta', async () => {
    const { deps, retryCalls } = buildDeps({ hasContact: false })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 0, retried: 1, exhausted: 0 })
    expect(retryCalls[0]).toMatchObject({ id: 'rem-1' })
  })
})
