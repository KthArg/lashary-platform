import type { MyAppointment } from '../../../application/ports'
import { CONFIRMABLE_STATUS } from '../../../domain/appointment-confirmation.constants'
import { formatAppointmentSlot } from '../../appointment-display/utils/format-appointment-slot'
import { formatAppointmentSummary } from '../../appointment-display/utils/format-appointment-summary'
import { CONFIRMED_APPOINTMENT_STATUS, confirmationMessages } from '../constants/confirmation-strings'
import { myAppointmentsMessages } from '../constants/my-appointments-strings'
import type { MyAppointmentsData, MyAppointmentView, MyAppointmentsScreen } from '../types/my-appointments.types'

export function toMyAppointmentView(appointment: MyAppointment): MyAppointmentView {
  const summary = formatAppointmentSummary({
    techniqueName: appointment.techniqueName,
    isFirstTime: appointment.isFirstTime,
    servicePrice: appointment.servicePrice,
    depositRequired: appointment.depositRequired,
  })

  return {
    id: appointment.id,
    service: summary.service,
    kind: summary.kind,
    amounts: summary.amounts,
    slot: formatAppointmentSlot(appointment.startsAtMs, appointment.endsAtMs),
    status: myAppointmentsMessages.status[appointment.status],
    heldNote: appointment.heldSchedule
      ? myAppointmentsMessages.heldSchedule(
          formatAppointmentSlot(appointment.heldSchedule.startsAtMs, appointment.heldSchedule.endsAtMs),
        )
      : null,
    canConfirm: appointment.status === CONFIRMABLE_STATUS,
    confirmedNote:
      appointment.status === CONFIRMED_APPOINTMENT_STATUS && appointment.depositRequired > 0
        ? confirmationMessages.confirmedNote
        : null,
  }
}

export function toMyAppointmentsView(data: MyAppointmentsData): MyAppointmentsScreen {
  if (data.status !== 'ready') return data
  if (data.appointments.length === 0) return { status: 'empty' }
  return { status: 'ready', appointments: data.appointments.map(toMyAppointmentView) }
}
