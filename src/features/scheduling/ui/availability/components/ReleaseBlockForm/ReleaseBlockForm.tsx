'use client'

import { useActionState, useId, useState } from 'react'
import { schedulingMessages } from '../../../messages'
import { releaseManualBlockAction } from '../../actions/availability-actions'
import { RELEASE_BLOCK_FIELDS } from '../../constants/availability.constants'
import { initialAvailabilityActionState } from '../../types/availability-action-state'
import { AvailabilityFeedback } from '../AvailabilityForms'
import { releaseBlockFormStyles as STYLES } from './ReleaseBlockForm.styles'
import type { ReleaseBlockFormProps } from './ReleaseBlockForm.types'

const releaseMessages = schedulingMessages.availability.blocks.release

// Liberar el final de un bloqueo con un deslizador de pasos de 30 minutos: se elige, no se escribe
// (US-AGE-07, criterio 3). Cada paso muestra la hora en que quedaría terminando el bloqueo.
export function ReleaseBlockForm({ id, label, endsAtIso, releaseEnds }: ReleaseBlockFormProps) {
  const [state, formAction, pending] = useActionState(releaseManualBlockAction, initialAvailabilityActionState)
  const [steps, setSteps] = useState(1)
  const sliderId = useId()
  if (releaseEnds.length === 0) return null

  // Tras liberar, el bloqueo es más corto y el valor elegido puede quedar por encima del máximo.
  const selectedSteps = Math.min(steps, releaseEnds.length)
  const untilLabel = releaseMessages.until(releaseEnds[selectedSteps - 1])
  return (
    <>
      <form action={formAction} className={STYLES.form}>
        <input type="hidden" name={RELEASE_BLOCK_FIELDS.id} value={id} />
        <input type="hidden" name={RELEASE_BLOCK_FIELDS.expectedEndsAt} value={endsAtIso} />
        <label htmlFor={sliderId} className={STYLES.label}>
          {releaseMessages.sliderLabel}
        </label>
        <input
          id={sliderId}
          type="range"
          name={RELEASE_BLOCK_FIELDS.steps}
          min={1}
          max={releaseEnds.length}
          step={1}
          value={selectedSteps}
          onChange={(event) => setSteps(Number(event.target.value))}
          aria-valuetext={untilLabel}
          className={STYLES.slider}
        />
        <output htmlFor={sliderId} className={STYLES.output}>
          {untilLabel}
        </output>
        <button type="submit" className={STYLES.submit} aria-label={label} disabled={pending}>
          {releaseMessages.submit}
        </button>
      </form>
      {state.status !== 'ok' && state.status !== 'idle' && (
        <AvailabilityFeedback state={state} formAction={formAction} pending={pending} />
      )}
    </>
  )
}
