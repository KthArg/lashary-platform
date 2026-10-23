import { Money } from '@/shared/money'
import { APPOINTMENT_DISPLAY_CHOICE } from '../constants/appointment-display.constants'
import type { AppointmentSummaryInput, AppointmentSummaryView } from '../types/appointment-display.types'

const money = (colones: number): string => Money.fromColones(colones).toString()

export function formatAppointmentSummary(choice: AppointmentSummaryInput | null): AppointmentSummaryView {
  const copy = APPOINTMENT_DISPLAY_CHOICE
  if (!choice) return { service: copy.noService, kind: null, amounts: null }

  return {
    service: choice.techniqueName,
    kind: choice.isFirstTime ? copy.firstTime : copy.retouch,
    amounts:
      choice.depositRequired > 0
        ? copy.priceAndDeposit(money(choice.servicePrice), money(choice.depositRequired))
        : copy.priceNoDeposit(money(choice.servicePrice)),
  }
}
