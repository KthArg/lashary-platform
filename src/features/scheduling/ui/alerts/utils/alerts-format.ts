import { isErr, type Result } from '@/shared/result'
import { STUDIO_TIME_ZONE } from '@/shared/studio-time'
import type { StorageFailed } from '../../../domain/errors'
import type { SchedulingAlert } from '../../../domain/alert'
import { alertsMessages } from '../constants/alerts-strings'
import type { AlertView, AlertsViewModel } from '../types/alerts.types'

const dayFormat = new Intl.DateTimeFormat('es-CR', { timeZone: STUDIO_TIME_ZONE, dateStyle: 'full' })
const timeFormat = new Intl.DateTimeFormat('es-CR', { timeZone: STUDIO_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const stampFormat = new Intl.DateTimeFormat('es-CR', { timeZone: STUDIO_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' })

const toAlertView = (alert: SchedulingAlert): AlertView => ({
  id: alert.id,
  title: alertsMessages.kinds[alert.kind].title,
  detail: alertsMessages.kinds[alert.kind].detail,
  requested: `${dayFormat.format(alert.requestedFromMs)} · ${timeFormat.format(alert.requestedFromMs)}–${timeFormat.format(alert.requestedUntilMs)}`,
  recorded: stampFormat.format(alert.createdAtMs),
})

export function toAlertsViewModel(result: Result<SchedulingAlert[], StorageFailed>): AlertsViewModel {
  if (isErr(result)) return { status: 'error' }
  if (result.value.length === 0) return { status: 'empty' }
  return { status: 'ready', alerts: result.value.map(toAlertView) }
}
