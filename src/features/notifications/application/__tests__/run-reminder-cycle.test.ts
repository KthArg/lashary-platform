import { describe, it, expect } from 'vitest'
import { ok, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { runReminderCycle } from '../run-reminder-cycle'
import type { AppointmentSnapshot, ContactInfo, ReminderUpsert } from '../ports'
import type { NotificationChannel } from '../ports'

describe('runReminderCycle', () => {
  it('encadena descubrir, reconciliar y enviar en una sola corrida', async () => {
    const newAppointment: AppointmentSnapshot = {
      appointmentId: 'appt-1', clientId: 'client-1', startsAt: fixedDate('2026-11-02T10:00:00Z'), techniqueName: 'Técnica A',
    }
    const inserted: ReminderUpsert[] = []
    const contact: ContactInfo = { phone: '+50688887777', email: 'clienta@example.com' }
    const channel = (kind: 'whatsapp' | 'email'): NotificationChannel => ({ kind, send: async () => ok(undefined) })

    const result = await runReminderCycle({
      listUpcoming: async () => ok([newAppointment]),
      insertIfAbsent: async (reminderUpsert) => { inserted.push(reminderUpsert); return ok(undefined) },
      newId: () => 'rem-1',
      clock: fixedClock('2026-11-01T10:00:00Z'),
      listPending: async () => ok([]),
      getAppointmentSnapshot: async () => ok(null),
      reschedulePending: async () => ok(undefined),
      cancelPending: async () => ok(undefined),
      listDuePending: async () => ok([]),
      getContact: async () => ok(contact),
      markSent: async () => ok(undefined),
      markRetry: async () => ok(undefined),
      markExhausted: async () => ok(undefined),
      primaryChannel: channel('whatsapp'),
      backupChannel: channel('email'),
    })()

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ discovered: 1, cancelled: 0, rescheduled: 0, sent: 0, retried: 0, exhausted: 0 })
    expect(inserted).toHaveLength(1)
  })
})
