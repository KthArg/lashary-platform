'use client'

import { cancellationMessages } from '../../constants/cancellation-strings'
import { useCancelAppointment } from '../../hooks/useCancelAppointment'
import { cancelAppointmentStyles as STYLES } from './CancelAppointment.styles'
import type { CancelAppointmentProps } from './CancelAppointment.types'

export function CancelAppointment({ appointmentId, slot, onCancelled }: CancelAppointmentProps) {
  const copy = cancellationMessages
  const { state, start, confirm, back, confirmBoxRef, startButtonRef } = useCancelAppointment(appointmentId, onCancelled)

  if (state.status === 'confirming' || state.status === 'cancelling') {
    const isCancelling = state.status === 'cancelling'
    return (
      <div ref={confirmBoxRef} tabIndex={-1} className={STYLES.confirmBox}>
        {state.status === 'confirming' && state.notice && (
          <div role="alert" className={STYLES.notice}>
            <span>{state.notice}</span>
          </div>
        )}
        <p className={STYLES.question}>{copy.confirmQuestion}</p>
        <p role="note" className={state.quote.losesDeposit ? STYLES.consequenceWarning : STYLES.consequence}>
          {state.quote.consequence}
        </p>
        <div className={STYLES.actions}>
          <button type="button" disabled={isCancelling} onClick={confirm} className={STYLES.confirmButton}>
            {isCancelling ? copy.cancelling : copy.confirmYes}
          </button>
          <button type="button" disabled={isCancelling} onClick={back} className={STYLES.backButton}>
            {copy.confirmBack}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={STYLES.box}>
      {state.status === 'failed' && (
        <div role="alert" className={STYLES.alertError}>
          <span>{state.message}</span>
        </div>
      )}
      <button
        ref={startButtonRef}
        type="button"
        disabled={state.status === 'quoting'}
        aria-label={copy.cancelButtonLabel(slot)}
        onClick={start}
        className={STYLES.cancelButton}
      >
        {state.status === 'quoting' ? copy.quoting : copy.cancelButton}
      </button>
    </div>
  )
}
