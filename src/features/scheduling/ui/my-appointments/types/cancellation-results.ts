export type CancellationQuoteView = {
  appointmentId: string
  consequence: string
  losesDeposit: boolean
  forfeitedDeposit: number
}

export type QuoteCancellationResult =
  | { ok: true; quote: CancellationQuoteView }
  | { ok: false; message: string }

export type CancelAppointmentResult =
  | { ok: true; message: string }
  | { ok: false; message: string; changedQuote?: CancellationQuoteView }
