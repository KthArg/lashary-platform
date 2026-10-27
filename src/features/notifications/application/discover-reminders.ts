import { ok, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { addHours } from '@/shared/date-math'
import { buildReminder, REMINDER_WINDOW_HOURS } from '../domain/reminder'
import type { SchedulingReadPort, ReminderRepository, RepositoryFailure } from './ports'

// Margen sobre las 24h exactas (criterio 1): una corrida que se atrase un rato igual encuentra
// las citas que ya están entrando a la ventana del recordatorio.
const DISCOVERY_MARGIN_HOURS = 2

export type DiscoverRemindersDeps = {
  listUpcoming: SchedulingReadPort['listActiveAppointmentsStartingWithin']
  insertIfAbsent: ReminderRepository['insertIfAbsent']
  newId: () => string
  clock: Clock
}

export type DiscoverRemindersSummary = { discovered: number }

// Encuentra citas activas que entran a la ventana de 24h y todavía no tienen recordatorio.
export const discoverReminders =
  (deps: DiscoverRemindersDeps) =>
  async (): Promise<Result<DiscoverRemindersSummary, RepositoryFailure>> => {
    const now = deps.clock()
    const windowEnd = addHours(now, REMINDER_WINDOW_HOURS + DISCOVERY_MARGIN_HOURS)

    const upcoming = await deps.listUpcoming({ from: now, to: windowEnd })
    if (isErr(upcoming)) return upcoming

    let discovered = 0
    for (const appointment of upcoming.value) {
      const built = buildReminder(deps.newId(), { ...appointment, createdAt: now })
      if (isErr(built)) continue

      const inserted = await deps.insertIfAbsent({
        id: built.value.id,
        appointmentId: built.value.appointmentId,
        clientId: built.value.clientId,
        startsAt: built.value.startsAt,
        techniqueName: built.value.techniqueName,
        sendAt: built.value.sendAt,
      })
      if (isErr(inserted)) return inserted
      discovered += 1
    }

    return ok({ discovered })
  }
