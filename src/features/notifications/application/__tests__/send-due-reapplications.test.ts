import { describe, it, expect } from 'vitest'
import { ok, err, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { sendDueReapplications, type SendDueReapplicationsDeps } from '../send-due-reapplications'
import { channelNotConfigured, channelSendFailed } from '../../domain/errors'
import { MAX_REMINDER_ATTEMPTS } from '../../domain/reminder'
import { reapplicationCycleKey } from '../../domain/reapplication-reminder'
import type { ContactInfo, DueReapplicationReminder, NotificationChannel, ReapplicationReminderRecord } from '../ports'

const CONTACT: ContactInfo = { phone: '+50688887777', email: 'clienta@example.com' }
const NOW = fixedDate('2026-11-13T00:00:00Z')

const due: DueReapplicationReminder = {
  clientId: 'client-1',
  techniqueId: 'tecnica-1',
  techniqueName: 'Clásico',
  lastCompletedAt: fixedDate('2026-09-01T17:00:00Z'),
  dueAt: fixedDate('2026-10-01T17:00:00Z'),
}

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
  records?: ReadonlyMap<string, ReapplicationReminderRecord>
  listRecordsFails?: boolean
  hasContact?: boolean
  contactReadFails?: boolean
  primary?: 'ok' | 'send-failed' | 'not-configured'
  backup?: 'ok' | 'send-failed' | 'not-configured'
}) {
  const sent: unknown[] = []
  const failed: unknown[] = []
  const deps: SendDueReapplicationsDeps = {
    listRecords: async () => (options.listRecordsFails ? err('repository-failed' as const) : ok(options.records ?? new Map())),
    recordSent: async (input) => {
      sent.push(input)
      return ok(undefined)
    },
    recordFailed: async (input) => {
      failed.push(input)
      return ok(undefined)
    },
    getContact: async () => {
      if (options.contactReadFails) return err('repository-failed' as const)
      return ok(options.hasContact === false ? null : CONTACT)
    },
    primaryChannel: fakeChannel('whatsapp', options.primary ?? 'ok'),
    backupChannel: fakeChannel('email', options.backup ?? 'ok'),
    clock: fixedClock(NOW.toISOString()),
  }
  return { deps, sent, failed }
}

describe('sendDueReapplications', () => {
  it('sin candidatas no consulta registros ni envía nada', async () => {
    const { deps, sent } = buildDeps({})
    const result = await sendDueReapplications(deps)([])

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ sent: 0, retried: 0, exhausted: 0, skipped: 0, errored: 0 })
    expect(sent).toEqual([])
  })

  it('manda por el canal primario y registra sent con attempts 1 la primera vez', async () => {
    const { deps, sent } = buildDeps({})
    const result = await sendDueReapplications(deps)([due])

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ sent: 1, retried: 0, exhausted: 0, skipped: 0, errored: 0 })
    expect(sent).toEqual([{
      clientId: 'client-1', techniqueId: 'tecnica-1', techniqueName: 'Clásico',
      lastCompletedAt: due.lastCompletedAt, dueAt: due.dueAt, attempts: 1, channel: 'whatsapp', sentAt: NOW,
    }])
  })

  it('ya avisada este ciclo (sent) se salta, sin leer contacto ni enviar', async () => {
    const key = reapplicationCycleKey(due.clientId, due.techniqueId, due.lastCompletedAt)
    const { deps, sent, failed } = buildDeps({ records: new Map([[key, { status: 'sent', attempts: 1 }]]) })

    const result = await sendDueReapplications(deps)([due])

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ sent: 0, retried: 0, exhausted: 0, skipped: 1, errored: 0 })
    expect(sent).toEqual([])
    expect(failed).toEqual([])
  })

  it('con intentos agotados (failed, attempts = MAX) se salta sin reintentar', async () => {
    const key = reapplicationCycleKey(due.clientId, due.techniqueId, due.lastCompletedAt)
    const { deps, failed } = buildDeps({ records: new Map([[key, { status: 'failed', attempts: MAX_REMINDER_ATTEMPTS }]]) })

    const result = await sendDueReapplications(deps)([due])

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ sent: 0, retried: 0, exhausted: 0, skipped: 1, errored: 0 })
    expect(failed).toEqual([])
  })

  it('con un fallo anterior (failed, attempts < MAX) reintenta y suma uno a attempts', async () => {
    const key = reapplicationCycleKey(due.clientId, due.techniqueId, due.lastCompletedAt)
    const { deps, sent } = buildDeps({ records: new Map([[key, { status: 'failed', attempts: 2 }]]) })

    const result = await sendDueReapplications(deps)([due])

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ sent: 1, retried: 0, exhausted: 0, skipped: 0, errored: 0 })
    expect(sent[0]).toMatchObject({ attempts: 3 })
  })

  it('sin contacto, registra failed sin gastar un intento prematuro hacia exhausted', async () => {
    const { deps, failed } = buildDeps({ hasContact: false })
    const result = await sendDueReapplications(deps)([due])

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ sent: 0, retried: 1, exhausted: 0, skipped: 0, errored: 0 })
    expect(failed[0]).toMatchObject({ attempts: 1, error: 'sin contacto registrado para la clienta' })
  })

  it('cae al canal de respaldo si el primario falla', async () => {
    const { deps, sent } = buildDeps({ primary: 'send-failed' })
    const result = await sendDueReapplications(deps)([due])

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ sent: 1, retried: 0, exhausted: 0, skipped: 0, errored: 0 })
    expect(sent[0]).toMatchObject({ channel: 'email' })
  })

  it('con los dos canales sin configurar, pasa a exhausted sin gastar reintentos (es permanente)', async () => {
    const { deps, failed } = buildDeps({ primary: 'not-configured', backup: 'not-configured' })
    const result = await sendDueReapplications(deps)([due])

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ sent: 0, retried: 0, exhausted: 1, skipped: 0, errored: 0 })
    expect(failed[0]).toMatchObject({ attempts: 1 })
  })

  it('con los dos canales fallando por error real, reintenta hasta agotar MAX_REMINDER_ATTEMPTS', async () => {
    const key = reapplicationCycleKey(due.clientId, due.techniqueId, due.lastCompletedAt)
    const { deps, failed } = buildDeps({
      primary: 'send-failed',
      backup: 'send-failed',
      records: new Map([[key, { status: 'failed', attempts: MAX_REMINDER_ATTEMPTS - 1 }]]),
    })

    const result = await sendDueReapplications(deps)([due])

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ sent: 0, retried: 0, exhausted: 1, skipped: 0, errored: 0 })
    expect(failed[0]).toMatchObject({ attempts: MAX_REMINDER_ATTEMPTS })
  })

  it('un fallo al leer los registros detiene todo con RepositoryFailure', async () => {
    const { deps } = buildDeps({ listRecordsFails: true })
    const result = await sendDueReapplications(deps)([due])
    expect(isOk(result)).toBe(false)
  })
})
