import { moneyFromColones, formatMoney } from '@/shared/money'
import type { CancellationQuote } from '../../../application/ports'
import { cancellationMessages } from '../constants/cancellation-strings'
import type { CancellationQuoteView } from '../types/cancellation-results'

const money = (colones: number): string => formatMoney(moneyFromColones(colones))

function describeConsequence(quote: CancellationQuote): string {
  const copy = cancellationMessages
  if (quote.withinWindow) return copy.withinWindow

  const hours = copy.hours(quote.windowHours)
  return quote.forfeitedDeposit > 0
    ? copy.outsideWindowLosesDeposit(hours, money(quote.forfeitedDeposit))
    : copy.outsideWindowNothingToLose(hours)
}

export function toCancellationQuoteView(appointmentId: string, quote: CancellationQuote): CancellationQuoteView {
  return {
    appointmentId,
    consequence: describeConsequence(quote),
    losesDeposit: quote.forfeitedDeposit > 0,
    forfeitedDeposit: quote.forfeitedDeposit,
  }
}
