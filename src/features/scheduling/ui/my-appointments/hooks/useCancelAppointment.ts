import { useEffect, useRef, useState } from 'react'
import { cancelAppointmentAction, quoteCancellationAction } from '../actions/cancel-appointment-actions'
import { cancellationMessages } from '../constants/cancellation-strings'
import type { CancellationQuoteView } from '../types/cancellation-results'

export type CancelAppointmentState =
  | { status: 'idle' }
  | { status: 'quoting' }
  | { status: 'confirming'; quote: CancellationQuoteView; notice?: string }
  | { status: 'cancelling'; quote: CancellationQuoteView }
  | { status: 'failed'; message: string }

const IDLE: CancelAppointmentState = { status: 'idle' }

export function useCancelAppointment(appointmentId: string, onCancelled: (message: string) => void) {
  const [state, setState] = useState<CancelAppointmentState>(IDLE)
  const confirmBoxRef = useRef<HTMLDivElement>(null)
  const startButtonRef = useRef<HTMLButtonElement>(null)
  const returnFocusToStart = useRef(false)
  const confirmationNotice = state.status === 'confirming' ? state.notice : undefined

  useEffect(() => {
    if (state.status === 'confirming') confirmBoxRef.current?.focus()
  }, [state.status, confirmationNotice])

  useEffect(() => {
    if (state.status === 'idle' && returnFocusToStart.current) {
      returnFocusToStart.current = false
      startButtonRef.current?.focus()
    }
  }, [state.status])

  async function start() {
    setState({ status: 'quoting' })
    try {
      const result = await quoteCancellationAction(appointmentId)
      setState(result.ok ? { status: 'confirming', quote: result.quote } : { status: 'failed', message: result.message })
    } catch {
      setState({ status: 'failed', message: cancellationMessages.failed })
    }
  }

  async function confirm() {
    if (state.status !== 'confirming') return
    setState({ status: 'cancelling', quote: state.quote })
    try {
      const result = await cancelAppointmentAction(appointmentId, state.quote.forfeitedDeposit)
      if (result.ok) onCancelled(result.message)
      else if (result.changedQuote) setState({ status: 'confirming', quote: result.changedQuote, notice: result.message })
      else setState({ status: 'failed', message: result.message })
    } catch {
      setState({ status: 'failed', message: cancellationMessages.failed })
    }
  }

  function back() {
    returnFocusToStart.current = true
    setState(IDLE)
  }

  return { state, start, confirm, back, confirmBoxRef, startButtonRef }
}
