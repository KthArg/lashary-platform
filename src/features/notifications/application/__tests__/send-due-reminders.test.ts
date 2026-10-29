import { describe, it, expect } from 'vitest'
import { ok, err, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { sendDueReminders, type SendDueRemindersDeps } from '../send-due-reminders'
import { channelNotConfigured, channelSendFailed } from '../../domain/errors'
import { MAX_REMINDER_ATTEMPTS, type ReminderSnapshot } from '../../domain/reminder'
import type { ContactInfo, NotificationChannel } from '../ports'

const dueReminder: ReminderSnapshot = {
  id: 'rem-1', appointmentId: 'appt-1', clientId: 'client-1',
  startsAt: fixedDate('2026-11-02T15:00:00Z'), techniqueName: 'Técnica A',
  sendAt: fixedDate('2026-11-01T15:00:00Z'), status: 'claimed',
  attempts: 0, lastError: null, lastChannel: null, sentAt: null,
}

const contact: ContactInfo = { phone: '+50688887777', email: 'clienta@example.com' }

function fakeChannel(kind: 'whatsapp' | 'email', outcome: 'ok' | 'send-failed' | 'not-configured'): NotificationChannel {
  return {
    kind,
    send: async () => {
      if (outcome === 'ok') return ok(undefined)
      if (outcome === 'not-configured') return err(channelNotConfigured(kind))
      return err(channelSendFailed(kind, 'fallo simulado'))
    },
  }
}

function buildDeps(options: {
  reminder?: ReminderSnapshot
  hasContact?: boolean
  contactReadFails?: boolean
  primary?: 'ok' | 'send-failed' | 'not-configured'
  backup?: 'ok' | 'send-failed' | 'not-configured'
}) {
  const reminder = options.reminder ?? dueReminder
  const sentCalls: unknown[] = []
  const retryCalls: unknown[] = []
  const exhaustedCalls: unknown[] = []
  const releasedIds: string[] = []
  const deps: SendDueRemindersDeps = {
      claimDuePending: async () => ok([reminder]),
      releaseToPending: async (id: string) => {
        releasedIds.push(id)
        return ok(undefined)
      },
      getContact: async () => {
        if (options.contactReadFails) return err('repository-failed' as const)
        return ok(options.hasContact === false ? null : contact)
      },
      markSent: async (id: string, channel: string, sentAt: Date) => {
        sentCalls.push({ id, channel, sentAt })
        return ok(undefined)
      },
      markRetry: async (id: string, attempts: number, error: string) => {
        retryCalls.push({ id, attempts, error })
        return ok(undefined)
      },
      markExhausted: async (id: string, attempts: number, error: string) => {
        exhaustedCalls.push({ id, attempts, error })
        return ok(undefined)
      },
      primaryChannel: fakeChannel('whatsapp', options.primary ?? 'ok'),
      backupChannel: fakeChannel('email', options.backup ?? 'ok'),
      clock: fixedClock('2026-11-01T15:00:01Z'),
  }
  return { deps, sentCalls, retryCalls, exhaustedCalls, releasedIds }
}

describe('sendDueReminders', () => {
  it('envía por el canal primario (WhatsApp) cuando funciona', async () => {
    const { deps, sentCalls } = buildDeps({})

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 1, retried: 0, exhausted: 0, errored: 0 })
    expect(sentCalls).toEqual([{ id: 'rem-1', channel: 'whatsapp', sentAt: fixedDate('2026-11-01T15:00:01Z') }])
  })

  it('cae al respaldo (email) si el canal primario falla (ADR-0006)', async () => {
    const { deps, sentCalls } = buildDeps({ primary: 'send-failed' })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 1, retried: 0, exhausted: 0, errored: 0 })
    expect(sentCalls).toEqual([{ id: 'rem-1', channel: 'email', sentAt: fixedDate('2026-11-01T15:00:01Z') }])
  })

  it('registra el fallo para reintentar cuando ambos canales fallan y quedan intentos (criterio 4)', async () => {
    const { deps, retryCalls, exhaustedCalls } = buildDeps({ primary: 'send-failed', backup: 'send-failed' })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 0, retried: 1, exhausted: 0, errored: 0 })
    expect(retryCalls).toHaveLength(1)
    expect(exhaustedCalls).toHaveLength(0)
  })

  it('deja de reintentar y queda failed al agotar el máximo de intentos', async () => {
    const atMax = { ...dueReminder, attempts: MAX_REMINDER_ATTEMPTS - 1 }
    const { deps, retryCalls, exhaustedCalls } = buildDeps({ reminder: atMax, primary: 'send-failed', backup: 'send-failed' })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 0, retried: 0, exhausted: 1, errored: 0 })
    expect(exhaustedCalls).toHaveLength(1)
    expect(retryCalls).toHaveLength(0)
  })

  it('registra el fallo si no hay contacto para la clienta', async () => {
    const { deps, retryCalls } = buildDeps({ hasContact: false })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 0, retried: 1, exhausted: 0, errored: 0 })
    expect(retryCalls[0]).toMatchObject({ id: 'rem-1' })
  })

  it('agota de inmediato, sin gastar reintentos, cuando ningún canal está configurado (M3)', async () => {
    const { deps, retryCalls, exhaustedCalls } = buildDeps({ primary: 'not-configured', backup: 'not-configured' })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 0, retried: 0, exhausted: 1, errored: 0 })
    expect(exhaustedCalls).toHaveLength(1)
    expect(retryCalls).toHaveLength(0)
  })

  it('no agota de inmediato si solo uno de los dos canales no está configurado', async () => {
    const { deps, retryCalls, exhaustedCalls } = buildDeps({ primary: 'not-configured', backup: 'send-failed' })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 0, retried: 1, exhausted: 0, errored: 0 })
    expect(retryCalls).toHaveLength(1)
    expect(exhaustedCalls).toHaveLength(0)
  })

  it('acota la longitud del último error guardado (M3)', async () => {
    const longMessage = 'x'.repeat(600)
    const primaryChannel: NotificationChannel = { kind: 'whatsapp', send: async () => err(channelSendFailed('whatsapp', longMessage)) }
    const backupChannel: NotificationChannel = { kind: 'email', send: async () => err(channelSendFailed('email', longMessage)) }
    const { deps, retryCalls } = buildDeps({})
    deps.primaryChannel = primaryChannel
    deps.backupChannel = backupChannel

    await sendDueReminders(deps)()

    expect(retryCalls).toHaveLength(1)
    const [{ error }] = retryCalls as { error: string }[]
    expect(error.length).toBeLessThanOrEqual(501)
  })

  it('libera a pending (sin gastar intentos) si falla la lectura del contacto', async () => {
    const { deps, releasedIds, retryCalls, exhaustedCalls } = buildDeps({ contactReadFails: true })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 0, retried: 0, exhausted: 0, errored: 1 })
    expect(releasedIds).toEqual(['rem-1'])
    expect(retryCalls).toHaveLength(0)
    expect(exhaustedCalls).toHaveLength(0)
  })

  it('cuenta como "errored" sin romper la corrida si no se pudo marcar el envío', async () => {
    const { deps } = buildDeps({})
    deps.markSent = async () => err('repository-failed' as const)

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ sent: 0, retried: 0, exhausted: 0, errored: 1 })
  })
})
