import { describe, it, expect, vi } from 'vitest'
import { ok, err, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { reconcileReminders } from '../reconcile-reminders'
import type { AppointmentSnapshot, ReminderReschedule } from '../ports'
import type { ReminderSnapshot } from '../../domain/reminder'

const pendingReminder: ReminderSnapshot = {
  id: 'rem-1', appointmentId: 'appt-1', clientId: 'client-1',
  startsAt: fixedDate('2026-11-02T15:00:00Z'), techniqueName: 'Técnica A',
  sendAt: fixedDate('2026-11-01T15:00:00Z'), status: 'pending',
  attempts: 0, lastError: null, lastChannel: null, sentAt: null,
}

function buildDeps(live: AppointmentSnapshot | null, options: { now?: string; snapshotFails?: boolean } = {}) {
  const rescheduled: ReminderReschedule[] = []
  const cancelledIds: string[] = []
  return {
    deps: {
      releaseExpiredClaims: async () => ok([]),
      listPending: async () => ok([pendingReminder]),
      getAppointmentSnapshot: async () => (options.snapshotFails ? err('repository-failed' as const) : ok(live)),
      reschedulePending: async (reschedule: ReminderReschedule) => {
        rescheduled.push(reschedule)
        return ok(undefined)
      },
      cancelPending: async (appointmentId: string) => {
        cancelledIds.push(appointmentId)
        return ok(undefined)
      },
      clock: fixedClock(options.now ?? '2026-11-01T16:00:00Z'),
    },
    rescheduled,
    cancelledIds,
  }
}

describe('reconcileReminders', () => {
  it('cancela el recordatorio cuando la cita ya no está activa (criterio 3)', async () => {
    const { deps, cancelledIds, rescheduled } = buildDeps(null)

    const result = await reconcileReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ releasedExpiredClaims: 0, cancelled: 1, rescheduled: 0, failed: 0 })
    expect(cancelledIds).toEqual(['appt-1'])
    expect(rescheduled).toHaveLength(0)
  })

  it('reprograma el recordatorio cuando la cita se movió de hora (criterio 3)', async () => {
    const { deps, rescheduled, cancelledIds } = buildDeps({
      appointmentId: 'appt-1', clientId: 'client-1', startsAt: fixedDate('2026-11-03T09:00:00Z'), techniqueName: 'Técnica A',
    })

    const result = await reconcileReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ releasedExpiredClaims: 0, cancelled: 0, rescheduled: 1, failed: 0 })
    expect(rescheduled).toEqual([{
      appointmentId: 'appt-1', startsAt: fixedDate('2026-11-03T09:00:00Z'), techniqueName: 'Técnica A',
      sendAt: fixedDate('2026-11-02T09:00:00Z'),
    }])
    expect(cancelledIds).toHaveLength(0)
  })

  it('no toca el recordatorio si la cita sigue igual', async () => {
    const { deps, rescheduled, cancelledIds } = buildDeps({
      appointmentId: 'appt-1', clientId: 'client-1', startsAt: pendingReminder.startsAt, techniqueName: pendingReminder.techniqueName,
    })

    const result = await reconcileReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ releasedExpiredClaims: 0, cancelled: 0, rescheduled: 0, failed: 0 })
    expect(rescheduled).toHaveLength(0)
    expect(cancelledIds).toHaveLength(0)
  })

  it('cancela en vez de reprogramar una cita activa que ya empezó (A3)', async () => {
    const { deps, rescheduled, cancelledIds } = buildDeps(
      { appointmentId: 'appt-1', clientId: 'client-1', startsAt: fixedDate('2026-11-01T15:30:00Z'), techniqueName: 'Técnica A' },
      { now: '2026-11-01T16:00:00Z' },
    )

    const result = await reconcileReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ releasedExpiredClaims: 0, cancelled: 1, rescheduled: 0, failed: 0 })
    expect(cancelledIds).toEqual(['appt-1'])
    expect(rescheduled).toHaveLength(0)
  })

  it('una cita que falla al consultarse no corta la corrida (M1)', async () => {
    const { deps, cancelledIds, rescheduled } = buildDeps(null, { snapshotFails: true })

    const result = await reconcileReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ releasedExpiredClaims: 0, cancelled: 0, rescheduled: 0, failed: 1 })
    expect(cancelledIds).toHaveLength(0)
    expect(rescheduled).toHaveLength(0)
  })

  it('libera un reclamo vencido antes de leer lo pendiente, así la misma corrida lo cancela si la cita ya no es válida', async () => {
    const callOrder: string[] = []
    const releasedReminder: ReminderSnapshot = {
      ...pendingReminder, id: 'rem-2', appointmentId: 'appt-2', status: 'pending',
    }
    const cancelledIds: string[] = []

    const deps = {
      releaseExpiredClaims: async () => {
        callOrder.push('releaseExpiredClaims')
        return ok([releasedReminder])
      },
      listPending: async () => {
        callOrder.push('listPending')
        return ok([pendingReminder, releasedReminder])
      },
      getAppointmentSnapshot: async (appointmentId: string) =>
        ok(appointmentId === 'appt-2' ? null : {
          appointmentId: 'appt-1', clientId: 'client-1',
          startsAt: pendingReminder.startsAt, techniqueName: pendingReminder.techniqueName,
        }),
      reschedulePending: async () => ok(undefined),
      cancelPending: async (appointmentId: string) => { cancelledIds.push(appointmentId); return ok(undefined) },
      clock: fixedClock('2026-11-01T16:00:00Z'),
    }

    const result = await reconcileReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(callOrder).toEqual(['releaseExpiredClaims', 'listPending'])
    expect(result.value).toEqual({ releasedExpiredClaims: 1, cancelled: 1, rescheduled: 0, failed: 0 })
    expect(cancelledIds).toEqual(['appt-2'])
  })

  it('registra el motivo y aborta el ciclo si falla la liberación de reclamos vencidos', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { deps } = buildDeps(null)

    const result = await reconcileReminders({
      ...deps,
      releaseExpiredClaims: async () => err('repository-failed' as const),
    })()

    expect(isOk(result)).toBe(false)
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('repository-failed'))
    consoleError.mockRestore()
  })
})
