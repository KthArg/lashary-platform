import { useState } from 'react'
import { confirmAppointmentManuallyAction } from '../actions/confirm-appointment-actions'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'

export type ManualConfirmationState =
  | { status: 'idle' }
  | { status: 'asking' }
  | { status: 'confirming' }
  | { status: 'failed'; message: string }

export function useManualConfirmation(appointmentId: string) {
  const [state, setState] = useState<ManualConfirmationState>({ status: 'idle' })

  function ask() {
    setState({ status: 'asking' })
  }

  function back() {
    setState({ status: 'idle' })
  }

  async function confirm() {
    setState({ status: 'confirming' })
    try {
      const result = await confirmAppointmentManuallyAction(appointmentId)
      setState(result.ok ? { status: 'idle' } : { status: 'failed', message: result.error })
    } catch {
      setState({ status: 'failed', message: COPY.confirmation.failed })
    }
  }

  return { state, ask, back, confirm }
}
