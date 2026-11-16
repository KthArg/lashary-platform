import { useState } from 'react'
import type { CloseOutcome } from '@/features/scheduling/domain/appointment-closing.constants'
import { closeAppointmentAction } from '../actions/close-appointment-actions'
import { closeAppointmentMessages } from '../constants/close-appointment.constants'
import type { UnclosedItemView } from '../types/daily-agenda.types'
import { describeClosed } from '../utils/closing-summary'

export type CloseDraft = { outcome: CloseOutcome; deliveredTechniqueId?: string; aftercareNote: string }

export type CloseAppointmentState =
  | { status: 'idle' }
  | ({ status: 'choosing' } & CloseDraft)
  | ({ status: 'closing' } & CloseDraft)
  | { status: 'failed'; message: string; draft?: CloseDraft }

const IDLE: CloseAppointmentState = { status: 'idle' }

export function useCloseAppointment(item: UnclosedItemView, onClosed: (message: string) => void) {
  const [state, setState] = useState<CloseAppointmentState>(IDLE)

  function start() {
    const draft = state.status === 'failed' ? state.draft : undefined
    setState({ status: 'choosing', ...(draft ?? { outcome: item.options[0].outcome, aftercareNote: '' }) })
  }

  function choose(outcome: CloseOutcome) {
    if (state.status !== 'choosing') return
    setState({ ...state, outcome })
  }

  function chooseService(deliveredTechniqueId: string) {
    if (state.status !== 'choosing') return
    setState({ ...state, deliveredTechniqueId: deliveredTechniqueId || undefined })
  }

  function writeAftercareNote(aftercareNote: string) {
    if (state.status !== 'choosing') return
    setState({ ...state, aftercareNote })
  }

  function back() {
    setState(IDLE)
  }

  async function confirm() {
    if (state.status !== 'choosing') return
    const draft: CloseDraft = {
      outcome: state.outcome,
      deliveredTechniqueId: state.deliveredTechniqueId,
      aftercareNote: state.aftercareNote,
    }
    setState({ status: 'closing', ...draft })
    const isCompleted = draft.outcome === 'completed'
    try {
      const result = await closeAppointmentAction({
        appointmentId: item.id,
        outcome: draft.outcome,
        deliveredTechniqueId: isCompleted ? draft.deliveredTechniqueId : undefined,
        aftercareNote: isCompleted ? draft.aftercareNote || undefined : undefined,
      })
      if (result.ok) onClosed(describeClosed(result.closing, item.clientName))
      else setState({ status: 'failed', message: result.error, draft })
    } catch {
      setState({ status: 'failed', message: closeAppointmentMessages.failed, draft })
    }
  }

  return { state, start, choose, chooseService, writeAftercareNote, back, confirm }
}
