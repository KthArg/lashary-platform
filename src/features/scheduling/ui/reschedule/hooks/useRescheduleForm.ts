import { useState } from 'react'
import type { CancellableStatus } from '../../../domain/appointment-cancellation.constants'
import { rescheduleAppointmentAction } from '../actions/reschedule-appointment-action'
import { rescheduleMessages } from '../constants/reschedule-strings'

export type RescheduleFormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'failed'; message: string }
  | { status: 'done'; message: string }

const IDLE: RescheduleFormState = { status: 'idle' }

export function useRescheduleForm(appointmentId: string, expectedStatus: CancellableStatus) {
  const [selectedStartsAtMs, setSelectedStartsAtMs] = useState<number | null>(null)
  const [state, setState] = useState<RescheduleFormState>(IDLE)

  function select(startsAtMs: number) {
    setSelectedStartsAtMs(startsAtMs)
    setState(IDLE)
  }

  async function submit() {
    if (selectedStartsAtMs === null || state.status === 'submitting') return
    setState({ status: 'submitting' })
    try {
      const result = await rescheduleAppointmentAction({
        appointmentId,
        newStartsAtMs: selectedStartsAtMs,
        expectedStatus,
      })
      setState(result.ok ? { status: 'done', message: result.message } : { status: 'failed', message: result.message })
    } catch {
      setState({ status: 'failed', message: rescheduleMessages.failed })
    }
  }

  return { selectedStartsAtMs, state, select, submit }
}
