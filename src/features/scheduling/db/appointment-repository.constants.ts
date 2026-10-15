// Función SQL que crea la cita serializando por recurso; el constraint sigue siendo la garantía.
export const CREATE_APPOINTMENT_FUNCTION = 'scheduling_create_appointment'

// SQLSTATE exclusion_violation.
export const EXCLUSION_VIOLATION_CODE = '23P01'

// Nombre fijo del evento que una alerta futura debe vigilar (criterio 5 de US-AGE-09).
export const OVERLAP_REJECTED_EVENT = 'scheduling.appointment_overlap_rejected'

// Rango cerrado al inicio y abierto al final, como exige el CHECK de la migración.
export const RANGE_LOWER_BOUND = '['
export const RANGE_UPPER_BOUND = ')'

export const DECIDE_APPOINTMENT_FUNCTION = 'scheduling_decide_appointment'

export const APPOINTMENTS_TABLE = 'scheduling_appointments'
