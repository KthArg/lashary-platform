import { describe, it, expect } from 'vitest'
import { ok, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { discoverReminders } from '../discover-reminders'
import type { AppointmentSnapshot, ReminderUpsert } from '../ports'

function buildDeps(appointments: AppointmentSnapshot[], options: { duplicateAppointmentId?: string } = {}) {
  const inserted: ReminderUpsert[] = []
  let counter = 0
  return {
    deps: {
      listUpcoming: async () => ok(appointments),
      insertIfAbsent: async (reminder: ReminderUpsert) => {
        inserted.push(reminder)
        return ok({ inserted: reminder.appointmentId !== options.duplicateAppointmentId })
      },
      newId: () => `rem-${++counter}`,
      clock: fixedClock('2026-11-01T10:00:00Z'),
    },
    inserted,
  }
}

describe('discoverReminders', () => {
  it('programa un recordatorio 24h antes por cada cita activa dentro de la ventana', async () => {
    const { deps, inserted } = buildDeps([
      { appointmentId: 'appt-1', clientId: 'client-1', startsAt: fixedDate('2026-11-02T10:00:00Z'), techniqueName: 'Técnica A' },
    ])

    const result = await discoverReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.discovered).toBe(1)
    expect(inserted).toEqual([{
      id: 'rem-1', appointmentId: 'appt-1', clientId: 'client-1',
      startsAt: fixedDate('2026-11-02T10:00:00Z'), techniqueName: 'Técnica A',
      sendAt: fixedDate('2026-11-01T10:00:00Z'),
    }])
  })

  it('omite una cita que ya no tiene 24h de margen sin romper la corrida', async () => {
    const { deps, inserted } = buildDeps([
      { appointmentId: 'appt-1', clientId: 'client-1', startsAt: fixedDate('2026-11-01T10:00:00Z'), techniqueName: 'Técnica A' },
    ])

    const result = await discoverReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.discovered).toBe(0)
    expect(inserted).toHaveLength(0)
  })

  it('no cuenta como descubierta una cita que ya tenía recordatorio (reclamo atómico, A2)', async () => {
    const { deps } = buildDeps([
      { appointmentId: 'appt-1', clientId: 'client-1', startsAt: fixedDate('2026-11-02T10:00:00Z'), techniqueName: 'Técnica A' },
    ], { duplicateAppointmentId: 'appt-1' })

    const result = await discoverReminders(deps)()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.discovered).toBe(0)
  })
})
