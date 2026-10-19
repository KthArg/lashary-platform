import { Money } from '@/shared/money'
import type { AppointmentChoice } from '../../../application/ports'
import { APPROVAL_QUEUE_CHOICE } from '../constants/approval-queue.labels'
import type { AppointmentChoiceView } from '../types/approval-queue.types'

const money = (colones: number): string => Money.fromColones(colones).toString()

export function formatAppointmentChoice(choice: AppointmentChoice | null): AppointmentChoiceView {
  const copy = APPROVAL_QUEUE_CHOICE
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
