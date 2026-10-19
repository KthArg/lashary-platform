'use client'

import Link from 'next/link'
import { useTechniqueSelector } from './hooks/useTechniqueSelector'
import { serviceOptionKey } from '../domain/service-option'
import { calendarHref } from './client-calendar/utils/calendar-params'
import { schedulingMessages } from './messages'
import { TECHNIQUE_SELECTOR_FIELDS, FIRST_TIME_OVERRIDE_VALUES } from './constants'
import { techniqueSelectorStyles as STYLES } from './TechniqueSelector.styles'
import type { SelectableTechniqueOption } from './load-technique-selection-page'

const selectorMessages = schedulingMessages.selector
const fields = TECHNIQUE_SELECTOR_FIELDS
const overrides = FIRST_TIME_OVERRIDE_VALUES

export function TechniqueSelector({ techniques }: { techniques: SelectableTechniqueOption[] }) {
  const { state, formAction, pending } = useTechniqueSelector()

  return (
    <form action={formAction} className={STYLES.form}>
      <fieldset className={STYLES.fieldset}>
        <legend className={STYLES.legend}>{selectorMessages.chooseTechnique}</legend>
        {techniques.map((technique) => (
          <label key={technique.id} className={STYLES.option} htmlFor={`technique-${technique.id}`}>
            <input
              id={`technique-${technique.id}`}
              type="radio"
              name={fields.techniqueId}
              value={technique.id}
              required
              className={STYLES.radio}
            />
            <span className={STYLES.optionName}>{technique.name}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className={STYLES.fieldset}>
        <legend className={STYLES.legend}>{selectorMessages.firstTimeQuestion}</legend>
        <label className={STYLES.option} htmlFor="override-auto">
          <input
            id="override-auto"
            type="radio"
            name={fields.isFirstTimeOverride}
            value={overrides.auto}
            defaultChecked
            className={STYLES.radio}
          />
          <span>{selectorMessages.autoOption}</span>
        </label>
        <label className={STYLES.option} htmlFor="override-first-time">
          <input
            id="override-first-time"
            type="radio"
            name={fields.isFirstTimeOverride}
            value={overrides.firstTime}
            className={STYLES.radio}
          />
          <span>{selectorMessages.firstTimeOption}</span>
        </label>
        <label className={STYLES.option} htmlFor="override-retouch">
          <input
            id="override-retouch"
            type="radio"
            name={fields.isFirstTimeOverride}
            value={overrides.retouch}
            className={STYLES.radio}
          />
          <span>{selectorMessages.retouchOption}</span>
        </label>
        <p className={STYLES.hint}>{selectorMessages.autoDetectHint}</p>
      </fieldset>

      <button type="submit" className={STYLES.submitButton} disabled={pending}>
        {selectorMessages.submit}
      </button>

      {state.status === 'ok' && state.selection && (
        <div role="status" className={STYLES.resultBox}>
          <p>{selectorMessages.computed}</p>
          <p className={STYLES.resultDuration}>
            {selectorMessages.durationLabel}: {state.selection.totalDurationMin} {selectorMessages.minutesShort}
          </p>
          <Link
            href={calendarHref({
              serviceKey: serviceOptionKey(state.selection.techniqueId, state.selection.isFirstTime),
            })}
            className={STYLES.calendarLink}
          >
            {selectorMessages.seeSlots}
          </Link>
        </div>
      )}
      {(state.status === 'invalid' || state.status === 'forbidden') && (
        <div role="alert" className={STYLES.errorBox}>
          {state.message}
        </div>
      )}
    </form>
  )
}
