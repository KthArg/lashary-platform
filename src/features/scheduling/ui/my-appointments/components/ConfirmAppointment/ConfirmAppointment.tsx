'use client'

import { confirmationMessages as COPY } from '../../constants/confirmation-strings'
import { useConfirmAppointment } from '../../hooks/useConfirmAppointment'
import { confirmAppointmentStyles as STYLES } from './ConfirmAppointment.styles'
import type { ConfirmAppointmentProps } from './ConfirmAppointment.types'

export function ConfirmAppointment({ appointmentId, slot, onConfirmed }: ConfirmAppointmentProps) {
  const { state, confirm } = useConfirmAppointment(appointmentId, onConfirmed)
  const isConfirming = state.status === 'confirming'

  return (
    <div className={STYLES.box}>
      {state.status === 'failed' && (
        <div role="alert" className={STYLES.alertError}>
          <span>{state.message}</span>
        </div>
      )}
      <button
        type="button"
        disabled={isConfirming}
        aria-label={COPY.confirmButtonLabel(slot)}
        onClick={confirm}
        className={STYLES.confirmButton}
      >
        {isConfirming ? COPY.confirming : COPY.confirmButton}
      </button>
    </div>
  )
}
