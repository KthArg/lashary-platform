// Periodo de gracia entre el cierre de la cita y la morosidad por revisar. De 1 a 90 días: aprobado por el PO (2026-11-08)
// y fijado también por la base (CHECK de `delinquency_settings` y la función `delinquency_set_grace_days`).
export const GRACE_DAYS_MIN = 1
export const GRACE_DAYS_MAX = 90

export const isValidGraceDays = (days: unknown): days is number =>
  typeof days === 'number' && Number.isInteger(days) && days >= GRACE_DAYS_MIN && days <= GRACE_DAYS_MAX
