import { formatStudioDate } from '@/shared/studio-time'
import type { InactiveClientLastReminder } from '@/features/notifications/domain/inactive-reminder'
import { inactiveClientsMessages as copy } from '../constants/inactive-clients-strings'

export function lastReminderLabel(reminder: InactiveClientLastReminder | null): string {
  if (reminder === null) return copy.noReminder
  return copy.reminder[reminder.status](formatStudioDate(reminder.sentAt ?? reminder.queuedAt))
}
