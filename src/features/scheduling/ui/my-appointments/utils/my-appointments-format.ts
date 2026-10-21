import type { MyAppointment } from '../../../application/ports'
import { formatAppointmentChoice } from '../../approval-queue/utils/format-appointment-choice'
import { formatAppointmentSlot } from '../../approval-queue/utils/format-appointment-slot'
import { myAppointmentsMessages } from '../constants/my-appointments-strings'
import type { MyAppointmentsData, MyAppointmentView, MyAppointmentsView } from '../types/my-appointments.types'

export function toMyAppointmentView(appointment: MyAppointment): MyAppointmentView {
  const choice = formatAppointmentChoice({
    techniqueName: appointment.techniqueName,
    isFirstTime: appointment.isFirstTime,
    detectedFirstTime: null,
    servicePrice: appointment.servicePrice,
    depositRequired: appointment.depositRequired,
  })

  return {
    id: appointment.id,
    service: choice.service,
    kind: choice.kind,
    amounts: choice.amounts,
    slot: formatAppointmentSlot(appointment.startsAtMs, appointment.endsAtMs),
    status: myAppointmentsMessages.status[appointment.status],
  }
}

export function toMyAppointmentsView(data: MyAppointmentsData): MyAppointmentsView {
  if (data.status !== 'ready') return data
  if (data.appointments.length === 0) return { status: 'empty' }
  return { status: 'ready', appointments: data.appointments.map(toMyAppointmentView) }
}
