import { useState } from 'react'
import type { CloseOutcome } from '@/features/scheduling/domain/appointment-closing.constants'
import { closeAppointmentAction } from '../actions/close-appointment-actions'
import { closeAppointmentMessages } from '../constants/close-appointment.constants'
import type { UnclosedItemView } from '../types/daily-agenda.types'
import { describeClosed } from '../utils/closing-summary'

export type CloseAppointmentState =
  | { status: 'idle' }
  | { status: 'choosing'; outcome: CloseOutcome }
  | { status: 'closing'; outcome: CloseOutcome }
  | { status: 'failed'; message: string }

const IDLE: CloseAppointmentState = { status: 'idle' }

export function useCloseAppointment(item: UnclosedItemView, onClosed: (message: string) => void) {
  const [state, setState] = useState<CloseAppointmentState>(IDLE)

  function start() {
    setState({ status: 'choosing', outcome: item.options[0].outcome })
  }

  function choose(outcome: CloseOutcome) {
    setState({ status: 'choosing', outcome })
  }

  function back() {
    setState(IDLE)
  }

  async function confirm() {
    if (state.status !== 'choosing') return
    const { outcome } = state
    setState({ status: 'closing', outcome })
    try {
      const result = await closeAppointmentAction({ appointmentId: item.id, outcome })
      if (result.ok) onClosed(describeClosed(result.closing, item.clientName))
      else setState({ status: 'failed', message: result.error })
    } catch {
      setState({ status: 'failed', message: closeAppointmentMessages.failed })
    }
  }

  return { state, start, choose, back, confirm }
}
