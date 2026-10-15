// Función SQL que crea la cita serializando por recurso (migración 20261014000001). La garantía de
// no-solape sigue siendo el exclusion constraint (DOM-010); la función solo evita los deadlocks
// que provoca el INSERT directo cuando varias reservas chocan a la vez.
export const CREATE_APPOINTMENT_FUNCTION = 'scheduling_create_appointment'

// SQLSTATE de exclusion_violation: el constraint de no-solape rechazó la fila (DOM-010).
export const EXCLUSION_VIOLATION_CODE = '23P01'

// Nombre fijo y buscable del evento. Que el constraint dispare en producción significa que la
// validación previa de la aplicación tiene un bug (ADR-0002, criterio 5 de US-AGE-09): este evento
// es lo que una alerta futura debe vigilar. Hoy no hay herramienta de alertas en el repo.
export const OVERLAP_REJECTED_EVENT = 'scheduling.appointment_overlap_rejected'

// Rango cerrado al inicio y abierto al final, como exige el CHECK de la migración.
export const RANGE_LOWER_BOUND = '['
export const RANGE_UPPER_BOUND = ')'

// Función SQL que aprueba o rechaza una cita pendiente (migración 20261014000002).
export const DECIDE_APPOINTMENT_FUNCTION = 'scheduling_decide_appointment'

export const APPOINTMENTS_TABLE = 'scheduling_appointments'
