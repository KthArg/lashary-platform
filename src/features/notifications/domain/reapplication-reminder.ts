import { addDays } from '@/shared/date-math'

export const REAPPLICATION_ANTICIPATION_DAYS_MIN = 1
export const REAPPLICATION_ANTICIPATION_DAYS_MAX = 30
export const REAPPLICATION_ANTICIPATION_DAYS_DEFAULT = 7
export const REAPPLICATION_OVERDUE_CUTOFF_DAYS = 30

export const isValidAnticipationDays = (days: unknown): days is number =>
  typeof days === 'number' &&
  Number.isInteger(days) &&
  days >= REAPPLICATION_ANTICIPATION_DAYS_MIN &&
  days <= REAPPLICATION_ANTICIPATION_DAYS_MAX

export function computeReapplicationDueDate(lastCompletedAt: Date, intervalDays: number): Date {
  return addDays(lastCompletedAt, intervalDays)
}

export function isReapplicationDue(dueDate: Date, anticipationDays: number, now: Date): boolean {
  return addDays(dueDate, -anticipationDays).getTime() <= now.getTime()
}

export function isReapplicationExpired(dueDate: Date, now: Date): boolean {
  return addDays(dueDate, REAPPLICATION_OVERDUE_CUTOFF_DAYS).getTime() < now.getTime()
}

export function reapplicationCycleKey(clientId: string, techniqueId: string, lastCompletedAt: Date): string {
  return `${clientId}:${techniqueId}:${lastCompletedAt.toISOString()}`
}
