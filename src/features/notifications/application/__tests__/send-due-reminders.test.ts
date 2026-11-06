import { describe, it, expect } from 'vitest'
import { ok, err, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { sendDueReminders, type SendDueRemindersDeps } from '../send-due-reminders'
import { channelNotConfigured, channelSendFailed } from '../../domain/errors'
import { MAX_REMINDER_ATTEMPTS, type ReminderSnapshot } from '../../domain/reminder'
import type { ReminderAttempt } from '../../domain/reminder-attempt'
import { MASKED_PHONE_NUMBER } from '../../domain/provider-error'
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
  recordAttemptFails?: boolean
}) {
  const reminder = options.reminder ?? dueReminder
  const sentCalls: unknown[] = []
  const retryCalls: unknown[] = []
  const exhaustedCalls: unknown[] = []
  const releasedIds: string[] = []
  const attempts: ReminderAttempt[] = []
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
      recordAttempt: async (attempt: ReminderAttempt) => {
        if (options.recordAttemptFails) return err('repository-failed' as const)
        attempts.push(attempt)
        return ok(undefined)
      },
      primaryChannel: fakeChannel('whatsapp', options.primary ?? 'ok'),
      backupChannel: fakeChannel('email', options.backup ?? 'ok'),
      clock: fixedClock('2026-11-01T15:00:01Z'),
  }
  return { deps, sentCalls, retryCalls, exhaustedCalls, releasedIds, attempts }
}

describe('sendDueReminders: bitácora de intentos (US-NOT-07, criterio 2)', () => {
  const attemptedAt = fixedDate('2026-11-01T15:00:01Z')
  const whatsappFailure = 'envío falló por whatsapp: fallo simulado'
  const emailFailure = 'envío falló por email: fallo simulado'

  it('registra el envío exitoso por WhatsApp, sin intento por correo', async () => {
    const { deps, attempts } = buildDeps({})

    await sendDueReminders(deps)()

    expect(attempts).toEqual([
      { reminderId: 'rem-1', attemptNumber: 1, channel: 'whatsapp', outcome: 'sent', error: null, attemptedAt },
    ])
  })

  it('conserva el fallo de WhatsApp cuando el correo lo rescata', async () => {
    const { deps, attempts } = buildDeps({ primary: 'send-failed' })

    await sendDueReminders(deps)()

    expect(attempts).toEqual([
      { reminderId: 'rem-1', attemptNumber: 1, channel: 'whatsapp', outcome: 'failed', error: whatsappFailure, attemptedAt },
      { reminderId: 'rem-1', attemptNumber: 1, channel: 'email', outcome: 'sent', error: null, attemptedAt },
    ])
  })

  it('registra los dos fallos con el número del intento en curso', async () => {
    const { deps, attempts } = buildDeps({ primary: 'send-failed', backup: 'send-failed', reminder: { ...dueReminder, attempts: 2 } })

    await sendDueReminders(deps)()

    expect(attempts).toEqual([
      { reminderId: 'rem-1', attemptNumber: 3, channel: 'whatsapp', outcome: 'failed', error: whatsappFailure, attemptedAt },
      { reminderId: 'rem-1', attemptNumber: 3, channel: 'email', outcome: 'failed', error: emailFailure, attemptedAt },
    ])
  })

  it('distingue un canal sin configurar de un envío fallido', async () => {
    const { deps, attempts } = buildDeps({ primary: 'not-configured' })

    await sendDueReminders(deps)()

    expect(attempts[0]).toEqual({
      reminderId: 'rem-1', attemptNumber: 1, channel: 'whatsapp', outcome: 'not_configured', error: 'canal sin configurar: whatsapp', attemptedAt,
    })
  })

  it('registra el intento sin canal cuando la clienta no tiene contacto', async () => {
    const { deps, attempts } = buildDeps({ hasContact: false })

    await sendDueReminders(deps)()

    expect(attempts).toEqual([
      { reminderId: 'rem-1', attemptNumber: 1, channel: null, outcome: 'no_contact', error: 'sin contacto registrado para la clienta', attemptedAt },
    ])
  })

  it('no registra intento si falló la lectura del contacto, porque no se intentó enviar', async () => {
    const { deps, attempts } = buildDeps({ contactReadFails: true })

    await sendDueReminders(deps)()

    expect(attempts).toEqual([])
  })

  it('acota el error guardado en la bitácora', async () => {
    const { deps, attempts } = buildDeps({})
    deps.primaryChannel = { kind: 'whatsapp', send: async () => err(channelSendFailed('whatsapp', 'x'.repeat(1000))) }

    await sendDueReminders(deps)()

    expect(attempts[0].error?.length).toBeLessThanOrEqual(501)
  })

  it('no pierde el envío si la bitácora falla: el recordatorio queda sent', async () => {
    const { deps, sentCalls } = buildDeps({ recordAttemptFails: true })

    const result = await sendDueReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.sent).toBe(1)
    expect(sentCalls).toHaveLength(1)
  })
})

describe('sendDueReminders: teléfono en el error del proveedor (US-NOT-07)', () => {
  const metaError = `Recipient ${contact.phone} is not a valid WhatsApp user`

  it('la bitácora y last_error guardan el error sin el teléfono de la clienta', async () => {
    const { deps, attempts, retryCalls } = buildDeps({ backup: 'send-failed' })
    deps.primaryChannel = { kind: 'whatsapp', send: async () => err(channelSendFailed('whatsapp', metaError)) }

    await sendDueReminders(deps)()

    const whatsappAttempt = attempts.find((attempt) => attempt.channel === 'whatsapp')
    expect(whatsappAttempt?.error).toContain(`Recipient ${MASKED_PHONE_NUMBER} is not a valid WhatsApp user`)
    expect(JSON.stringify(retryCalls)).not.toContain(contact.phone)
    expect(JSON.stringify(retryCalls)).toContain(MASKED_PHONE_NUMBER)
  })

  it('al agotar los reintentos last_error tampoco lleva el teléfono', async () => {
    const lastAttempt = { ...dueReminder, attempts: MAX_REMINDER_ATTEMPTS - 1 }
    const { deps, exhaustedCalls } = buildDeps({ reminder: lastAttempt, backup: 'send-failed' })
    deps.primaryChannel = { kind: 'whatsapp', send: async () => err(channelSendFailed('whatsapp', metaError)) }

    await sendDueReminders(deps)()

    expect(JSON.stringify(exhaustedCalls)).not.toContain(contact.phone)
  })
})

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
