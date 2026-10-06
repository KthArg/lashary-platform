'use client'

import { useTechniqueSelector } from './hooks/useTechniqueSelector'
import { schedulingMessages } from './messages'
import { TECHNIQUE_SELECTOR_FIELDS, FIRST_TIME_OVERRIDE_VALUES } from './constants'
import { techniqueSelectorStyles as s } from './TechniqueSelector.styles'
import type { SelectableTechniqueOption } from './load-technique-selection-page'

const m = schedulingMessages.selector
const fields = TECHNIQUE_SELECTOR_FIELDS
const overrides = FIRST_TIME_OVERRIDE_VALUES

export function TechniqueSelector({ techniques }: { techniques: SelectableTechniqueOption[] }) {
  const { state, formAction, pending } = useTechniqueSelector()

  return (
    <form action={formAction} className={s.form}>
      <fieldset className={s.fieldset}>
        <legend className={s.legend}>{m.chooseTechnique}</legend>
        {techniques.map((technique) => (
          <label key={technique.id} className={s.option} htmlFor={`technique-${technique.id}`}>
            <input
              id={`technique-${technique.id}`}
              type="radio"
              name={fields.techniqueId}
              value={technique.id}
              required
              className={s.radio}
            />
            <span className={s.optionName}>{technique.name}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className={s.fieldset}>
        <legend className={s.legend}>{m.firstTimeQuestion}</legend>
        <label className={s.option} htmlFor="override-auto">
          <input
            id="override-auto"
            type="radio"
            name={fields.isFirstTimeOverride}
            value={overrides.auto}
            defaultChecked
            className={s.radio}
          />
          <span>{m.autoOption}</span>
        </label>
        <label className={s.option} htmlFor="override-first-time">
          <input
            id="override-first-time"
            type="radio"
            name={fields.isFirstTimeOverride}
            value={overrides.firstTime}
            className={s.radio}
          />
          <span>{m.firstTimeOption}</span>
        </label>
        <label className={s.option} htmlFor="override-retouch">
          <input
            id="override-retouch"
            type="radio"
            name={fields.isFirstTimeOverride}
            value={overrides.retouch}
            className={s.radio}
          />
          <span>{m.retouchOption}</span>
        </label>
        <p className={s.hint}>{m.autoDetectHint}</p>
      </fieldset>

      <button type="submit" className={s.submitButton} disabled={pending}>
        {m.submit}
      </button>

      {state.status === 'ok' && state.selection && (
        <div role="status" className={s.resultBox}>
          <p>{m.computed}</p>
          <p className={s.resultDuration}>
            {m.durationLabel}: {state.selection.totalDurationMin} {m.minutesShort}
          </p>
        </div>
      )}
      {(state.status === 'invalid' || state.status === 'forbidden') && (
        <div role="alert" className={s.errorBox}>
          {state.message}
        </div>
      )}
    </form>
  )
}
