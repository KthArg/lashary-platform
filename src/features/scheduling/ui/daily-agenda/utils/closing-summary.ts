import { formatMoney, moneyFromColones } from '@/shared/money'
import type { ClosedAppointment } from '@/features/scheduling/application/closing-ports'
import type { AppointmentClosing } from '@/features/scheduling/domain/appointment-closing'
import { NO_AMOUNT } from '@/features/scheduling/domain/appointment-closing.constants'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'

const formatColones = (colones: number): string => formatMoney(moneyFromColones(colones))

export function summarizeClosing(closing: AppointmentClosing): string {
  if (closing.outcome === 'completed' && closing.amountDue < NO_AMOUNT) {
    return COPY.close.completedCreditSummary(
      formatColones(closing.chargeAmount),
      formatColones(closing.depositCredit),
      formatColones(-closing.amountDue),
    )
  }
  if (closing.outcome === 'completed') {
    return COPY.close.completedSummary(
      formatColones(closing.chargeAmount),
      formatColones(closing.depositCredit),
      formatColones(closing.amountDue),
    )
  }
  return closing.forfeitedDeposit > NO_AMOUNT
    ? COPY.close.noShowSummary(formatColones(closing.forfeitedDeposit))
    : COPY.close.noShowWithoutDeposit
}

export const describeClosed = (closed: ClosedAppointment, clientName: string): string =>
  COPY.close.closed(clientName, summarizeClosing(closed))
