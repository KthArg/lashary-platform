export const CREATE_APPOINTMENT_FUNCTION = 'scheduling_create_appointment'

export const EXCLUSION_VIOLATION_CODE = '23P01'

export const OVERLAP_REJECTED_EVENT = 'scheduling.appointment_overlap_rejected'

export const RANGE_LOWER_BOUND = '['
export const RANGE_UPPER_BOUND = ')'

export const DECIDE_APPOINTMENT_FUNCTION = 'scheduling_decide_appointment'

export const SCHEDULE_CHANGED_MESSAGE = 'scheduling_appointment_schedule_changed'

export const SCHEDULE_DETAIL_SEPARATOR = '|'

export const APPOINTMENTS_TABLE = 'scheduling_appointments'

export const PENDING_APPOINTMENTS_LIMIT = 100

export const CLIENT_NAMES_FUNCTION = 'clients_display_names'

export const DAILY_AGENDA_COLUMNS =
  'id, status, starts_at, ends_at, client_id, technique_name, is_first_time, deposit_required, deposit_registered'

export const PENDING_APPOINTMENT_COLUMNS =
  'id, starts_at, ends_at, client_id, technique_name, package_name, is_first_time, is_first_time_detected, service_price, deposit_required, previous_starts_at, previous_ends_at'
