import type { MyAppointment } from '../../../application/ports'
import { formatAppointmentSlot } from '../../appointment-display/utils/format-appointment-slot'
import { formatAppointmentSummary } from '../../appointment-display/utils/format-appointment-summary'
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
  }
}

export function toMyAppointmentsView(data: MyAppointmentsData): MyAppointmentsScreen {
  if (data.status !== 'ready') return data
  if (data.appointments.length === 0) return { status: 'empty' }
  return { status: 'ready', appointments: data.appointments.map(toMyAppointmentView) }
}
