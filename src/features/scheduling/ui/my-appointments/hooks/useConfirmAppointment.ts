import { useState } from 'react'
import { confirmAppointmentAction } from '../actions/confirm-appointment-actions'
import { confirmationMessages } from '../constants/confirmation-strings'

export type ConfirmAppointmentState =
  | { status: 'idle' }
  | { status: 'confirming' }
  | { status: 'failed'; message: string }

export function useConfirmAppointment(appointmentId: string, onConfirmed: (message: string) => void) {
  const [state, setState] = useState<ConfirmAppointmentState>({ status: 'idle' })

  async function confirm() {
    setState({ status: 'confirming' })
    try {
      const result = await confirmAppointmentAction(appointmentId)
      if (result.ok) onConfirmed(result.message)
      else setState({ status: 'failed', message: result.message })
    } catch {
      setState({ status: 'failed', message: confirmationMessages.failed })
    }
  }

  return { state, confirm }
}
