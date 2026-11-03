import { describe, it, expect } from 'vitest'
import { ok, err, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { runReminderCycle } from '../run-reminder-cycle'
import type { AppointmentSnapshot, ContactInfo, ReminderUpsert } from '../ports'
import type { ClientNoticeDeliveryRepository, NotificationChannel } from '../ports'

const noClientNotices: ClientNoticeDeliveryRepository = {
  claimDue: async () => ok([]),
  releaseToPending: async () => ok(undefined),
  markSent: async () => ok(undefined),
  markRetry: async () => ok(undefined),
  markExhausted: async () => ok(undefined),
}

describe('runReminderCycle', () => {
  it('encadena descubrir, reconciliar y enviar en una sola corrida', async () => {
    const newAppointment: AppointmentSnapshot = {
      appointmentId: 'appt-1', clientId: 'client-1', startsAt: fixedDate('2026-11-02T10:00:00Z'), techniqueName: 'Técnica A',
    }
    const inserted: ReminderUpsert[] = []
    const contact: ContactInfo = { phone: '+50688887777', email: 'clienta@example.com' }
    const channel = (kind: 'whatsapp' | 'email'): NotificationChannel => ({ kind, send: async () => ok(undefined) })

    const result = await runReminderCycle({
      expireUndecidedReschedules: async () => ok(0),
      listUpcoming: async () => ok([newAppointment]),
      insertIfAbsent: async (reminderUpsert) => { inserted.push(reminderUpsert); return ok({ inserted: true }) },
      newId: () => 'rem-1',
      clock: fixedClock('2026-11-01T10:00:00Z'),
      releaseExpiredClaims: async () => ok([]),
      listPending: async () => ok([]),
      getAppointmentSnapshot: async () => ok(null),
      reschedulePending: async () => ok(undefined),
      cancelPending: async () => ok(undefined),
      claimDuePending: async () => ok([]),
      releaseToPending: async () => ok(undefined),
      getContact: async () => ok(contact),
      markSent: async () => ok(undefined),
      markRetry: async () => ok(undefined),
      markExhausted: async () => ok(undefined),
      clientNotices: noClientNotices,
      primaryChannel: channel('whatsapp'),
      backupChannel: channel('email'),
    })()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({
      expiredReschedules: 0, expireFailed: 0,
      discovered: 1, discoverFailed: 0, releasedExpiredClaims: 0, cancelled: 0, rescheduled: 0, reconcileFailed: 0,
      sent: 0, retried: 0, exhausted: 0, sendErrored: 0,
      noticesSent: 0, noticesRetried: 0, noticesExhausted: 0, noticesErrored: 0, noticesFailed: 0,
    })
    expect(inserted).toHaveLength(1)
  })

  const quietDeps = (steps: string[]) => ({
    listUpcoming: async () => (steps.push('discover'), ok([])),
    insertIfAbsent: async () => ok({ inserted: true }),
    newId: () => 'rem-1',
    clock: fixedClock('2026-11-01T10:00:00Z'),
    releaseExpiredClaims: async () => ok([]),
    listPending: async () => ok([]),
    getAppointmentSnapshot: async () => ok(null),
    reschedulePending: async () => ok(undefined),
    cancelPending: async () => ok(undefined),
    claimDuePending: async () => ok([]),
    releaseToPending: async () => ok(undefined),
    getContact: async () => ok(null),
    markSent: async () => ok(undefined),
    markRetry: async () => ok(undefined),
    markExhausted: async () => ok(undefined),
    clientNotices: noClientNotices,
    primaryChannel: { kind: 'whatsapp' as const, send: async () => ok(undefined) },
    backupChannel: { kind: 'email' as const, send: async () => ok(undefined) },
  })

  it('vence primero los reagendados sin decisión, así la cita devuelta a su horario recibe su recordatorio en la misma corrida', async () => {
    const steps: string[] = []
    const result = await runReminderCycle({
      ...quietDeps(steps),
      expireUndecidedReschedules: async () => (steps.push('expire'), ok(2)),
    })()

    expect(steps).toEqual(['expire', 'discover'])
    expect(isOk(result) && result.value).toMatchObject({ expiredReschedules: 2, expireFailed: 0 })
  })

  it('si vencer reagendados falla, el ciclo sigue: los recordatorios no dependen de ese paso', async () => {
    const steps: string[] = []
    const result = await runReminderCycle({
      ...quietDeps(steps),
      expireUndecidedReschedules: async () => err('repository-failed' as const),
    })()

    expect(steps).toEqual(['discover'])
    expect(isOk(result) && result.value).toMatchObject({ expiredReschedules: 0, expireFailed: 1 })
  })

  it('manda los avisos a la clienta justo después de vencer reagendados, así el aviso de un vencimiento sale en la misma corrida (US-NOT-02)', async () => {
    const steps: string[] = []
    const result = await runReminderCycle({
      ...quietDeps(steps),
      expireUndecidedReschedules: async () => (steps.push('expire'), ok(1)),
      clientNotices: { ...noClientNotices, claimDue: async () => (steps.push('notices'), ok([])) },
    })()

    expect(steps).toEqual(['expire', 'notices', 'discover'])
    expect(isOk(result) && result.value).toMatchObject({ noticesSent: 0, noticesFailed: 0 })
  })

  it('si los avisos a la clienta no se pueden reclamar, el ciclo sigue con los recordatorios y lo cuenta', async () => {
    const steps: string[] = []
    const result = await runReminderCycle({
      ...quietDeps(steps),
      expireUndecidedReschedules: async () => ok(0),
      clientNotices: { ...noClientNotices, claimDue: async () => err('repository-failed') },
    })()

    expect(steps).toEqual(['discover'])
    expect(isOk(result) && result.value).toMatchObject({ noticesFailed: 1 })
  })
})
