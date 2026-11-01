'use client'

import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import { useCloseAppointment } from '../hooks/useCloseAppointment'
import { dailyAgendaStyles as STYLES } from '../styles/daily-agenda.styles'
import type { UnclosedItemView } from '../types/daily-agenda.types'

export function CloseAppointmentControl({
  item,
  onClosed,
}: {
  item: UnclosedItemView
  onClosed: (message: string) => void
}) {
  const { state, start, choose, back, confirm } = useCloseAppointment(item, onClosed)

  if (state.status === 'choosing' || state.status === 'closing') {
    const isClosing = state.status === 'closing'
    return (
      <fieldset className={STYLES.closeBox} disabled={isClosing}>
        <legend className={STYLES.closeLegend}>{COPY.close.question(item.clientName)}</legend>
        {item.options.map((option) => (
          <label key={option.outcome} className={STYLES.closeOption}>
            <input
              type="radio"
              name={`close-${item.id}`}
              checked={state.outcome === option.outcome}
              onChange={() => choose(option.outcome)}
            />
            <span>
              <span className={STYLES.closeOptionLabel}>{option.label}</span>
              <span className={STYLES.closeOptionSummary}>{option.summary}</span>
            </span>
          </label>
        ))}
        <div className={STYLES.actions}>
          <button type="button" onClick={confirm} className={STYLES.closeConfirm}>
            {isClosing ? COPY.close.closing : COPY.close.confirm}
          </button>
          <button type="button" onClick={back} className={STYLES.action}>
            {COPY.close.back}
          </button>
        </div>
      </fieldset>
    )
  }

  return (
    <div className={STYLES.closeBox}>
      {state.status === 'failed' ? (
        <p role="alert" className={STYLES.closeError}>
          {state.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={start}
        aria-label={COPY.close.startLabel(item.clientName, item.dayLabel)}
        className={STYLES.action}
      >
        {COPY.close.start}
      </button>
    </div>
  )
}
