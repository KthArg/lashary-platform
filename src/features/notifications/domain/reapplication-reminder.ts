import { addDays } from '@/shared/date-math'

// Días de anticipación con que la administradora decide avisar antes de la fecha estimada de
// re-aplicación. 7 por defecto, de 1 a 30: aprobado por el líder del proyecto (2026-11-13,
// docs/process/DEPENDENCIES.md), mismo patrón que la gracia de US-MOR-01 y el plazo de US-NOT-08.
export const REAPPLICATION_ANTICIPATION_DAYS_MIN = 1
export const REAPPLICATION_ANTICIPATION_DAYS_MAX = 30
export const REAPPLICATION_ANTICIPATION_DAYS_DEFAULT = 7

export const isValidAnticipationDays = (days: unknown): days is number =>
  typeof days === 'number' &&
  Number.isInteger(days) &&
  days >= REAPPLICATION_ANTICIPATION_DAYS_MIN &&
  days <= REAPPLICATION_ANTICIPATION_DAYS_MAX

// Criterio 1: fecha estimada de re-aplicación = última cita completada + intervalo del catálogo.
export function computeReapplicationDueDate(lastCompletedAt: Date, intervalDays: number): Date {
  return addDays(lastCompletedAt, intervalDays)
}

// Criterios 2 y 3: se acerca cuando entra en la ventana de anticipación configurada; también
// avisa si la fecha estimada ya pasó (sin tope por arriba, igual que el plazo de confirmación de
// US-NOT-08 o la gracia de US-MOR-01: cruzar el umbral es lo que importa).
export function isReapplicationDue(dueDate: Date, anticipationDays: number, now: Date): boolean {
  return addDays(dueDate, -anticipationDays).getTime() <= now.getTime()
}

// Identifica un ciclo de re-aplicación: mismo trío = mismo intento de aviso. Cambia solo cuando una
// nueva cita completada mueve lastCompletedAt, que es justo lo que debe volver a habilitar el aviso.
export function reapplicationCycleKey(clientId: string, techniqueId: string, lastCompletedAt: Date): string {
  return `${clientId}:${techniqueId}:${lastCompletedAt.toISOString()}`
}
