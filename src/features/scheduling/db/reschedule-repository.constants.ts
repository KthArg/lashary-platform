export const RESCHEDULE_APPOINTMENT_FUNCTION = 'scheduling_reschedule_appointment'

export const RESCHEDULE_ERROR_MESSAGES = {
  clientNotRegistered: 'scheduling_client_not_registered',
  appointmentNotReschedulable: 'scheduling_appointment_not_reschedulable',
  outsideWindow: 'scheduling_reschedule_outside_window',
  limitReached: 'scheduling_reschedule_limit_reached',
  stateChanged: 'scheduling_reschedule_state_changed',
  slotNotOffered: 'scheduling_slot_not_offered',
  slotTaken: 'scheduling_slot_taken',
  tooManyPending: 'scheduling_too_many_pending',
} as const
