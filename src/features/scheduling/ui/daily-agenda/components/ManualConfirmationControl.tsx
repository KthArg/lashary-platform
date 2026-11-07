'use client'

import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import { useManualConfirmation } from '../hooks/useManualConfirmation'
import { dailyAgendaStyles as STYLES } from '../styles/daily-agenda.styles'

export function ManualConfirmationControl({
  appointmentId,
  clientName,
  label,
}: {
  appointmentId: string
  clientName: string
  label: string
}) {
  const { state, ask, back, confirm } = useManualConfirmation(appointmentId)

  if (state.status === 'asking' || state.status === 'confirming') {
    const isConfirming = state.status === 'confirming'
    return (
      <fieldset className={STYLES.closeBox} disabled={isConfirming}>
        <legend className={STYLES.closeLegend}>{COPY.confirmation.question(clientName)}</legend>
        <p className={STYLES.closeWarning}>{COPY.confirmation.irreversibleWarning}</p>
        <div className={STYLES.actions}>
          <button type="button" onClick={confirm} className={STYLES.closeConfirm}>
            {isConfirming ? COPY.confirmation.confirming : COPY.confirmation.confirm}
          </button>
          <button type="button" onClick={back} className={STYLES.action}>
            {COPY.confirmation.back}
          </button>
        </div>
      </fieldset>
    )
  }

  return (
    <>
      <button type="button" aria-label={label} onClick={ask} className={STYLES.action}>
        {COPY.confirmation.register}
      </button>
      {state.status === 'failed' ? (
        <p role="alert" className={STYLES.closeError}>
          {state.message}
        </p>
      ) : null}
    </>
  )
}
