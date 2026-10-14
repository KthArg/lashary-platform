'use client'

import { useActionState } from 'react'
import { schedulingMessages } from '../messages'
import { availabilityStyles as STYLES } from './availability.styles'
import {
  initialAvailabilityActionState,
  type AvailabilityActionState,
} from './availability-action-state'
import {
  addClosedDateAction,
  addManualBlockAction,
  addWeeklyBlockAction,
  removeClosedDateAction,
  removeWeeklyBlockAction,
} from './availability-actions'

const m = schedulingMessages.availability

type Action = (prev: AvailabilityActionState, formData: FormData) => Promise<AvailabilityActionState>

export function AvailabilityFeedback({ state }: { state: AvailabilityActionState }) {
  if (state.status === 'idle') return null
  if (state.status === 'ok') {
    return (
      <div role="status" className={STYLES.alertSuccess}>
        <span>{state.message}</span>
      </div>
    )
  }
  if (state.status === 'invalid') {
    return (
      <div role="alert" className={STYLES.alertError}>
        <div>
          <p className={STYLES.feedbackTitle}>{m.validationTitle}</p>
          <ul className={STYLES.feedbackList}>
            {(state.problems ?? []).map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      </div>
    )
  }
  return (
    <div role="alert" className={STYLES.alertWarning}>
      <span>{state.message}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={STYLES.field}>
      <span className={STYLES.labelText}>{label}</span>
      {children}
    </label>
  )
}

function useFormAction(action: Action) {
  return useActionState(action, initialAvailabilityActionState)
}

export function WeeklyBlockForm() {
  const [state, formAction, pending] = useFormAction(addWeeklyBlockAction)
  return (
    <>
      <form action={formAction} className={STYLES.form}>
        <Field label={m.weekly.weekdayLabel}>
          <select name="weekday" className={STYLES.select} defaultValue="1" required>
            {m.weekdays.map((day, index) => (
              <option key={day} value={index + 1}>
                {day}
              </option>
            ))}
          </select>
        </Field>
        <Field label={m.weekly.startLabel}>
          <input type="time" name="start" className={STYLES.input} required />
        </Field>
        <Field label={m.weekly.endLabel}>
          <input type="time" name="end" className={STYLES.input} required />
        </Field>
        <button type="submit" className={STYLES.submit} disabled={pending}>
          {m.weekly.submit}
        </button>
      </form>
      <AvailabilityFeedback state={state} />
    </>
  )
}

export function ClosedDateForm() {
  const [state, formAction, pending] = useFormAction(addClosedDateAction)
  return (
    <>
      <form action={formAction} className={STYLES.form}>
        <Field label={m.closed.dateLabel}>
          <input type="date" name="date" className={STYLES.input} required />
        </Field>
        <Field label={m.closed.kindLabel}>
          <select name="kind" className={STYLES.select} defaultValue="holiday" required>
            {Object.entries(m.closed.kinds).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={m.closed.labelLabel}>
          <input type="text" name="label" className={STYLES.input} placeholder={m.closed.labelPlaceholder} />
        </Field>
        <button type="submit" className={STYLES.submit} disabled={pending}>
          {m.closed.submit}
        </button>
      </form>
      <AvailabilityFeedback state={state} />
    </>
  )
}

export function ManualBlockForm() {
  const [state, formAction, pending] = useFormAction(addManualBlockAction)
  return (
    <>
      <form action={formAction} className={STYLES.form}>
        <Field label={m.blocks.dateLabel}>
          <input type="date" name="date" className={STYLES.input} required />
        </Field>
        <Field label={m.blocks.startLabel}>
          <input type="time" name="start" className={STYLES.input} required />
        </Field>
        <Field label={m.blocks.endLabel}>
          <input type="time" name="end" className={STYLES.input} required />
        </Field>
        <Field label={m.blocks.reasonLabel}>
          <input type="text" name="reason" className={STYLES.input} />
        </Field>
        <button type="submit" className={STYLES.submit} disabled={pending}>
          {m.blocks.submit}
        </button>
      </form>
      <AvailabilityFeedback state={state} />
    </>
  )
}

// Botón de quitar con su propio estado: si la fila ya no existe, el aviso aparece junto a ella.
function RemoveButton({ action, id, label }: { action: Action; id: string; label: string }) {
  const [state, formAction, pending] = useFormAction(action)
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={STYLES.removeButton} aria-label={label} disabled={pending}>
        {m.remove}
      </button>
      {state.status !== 'ok' && <AvailabilityFeedback state={state} />}
    </form>
  )
}

export function RemoveWeeklyBlockButton({ id, label }: { id: string; label: string }) {
  return <RemoveButton action={removeWeeklyBlockAction} id={id} label={label} />
}

export function RemoveClosedDateButton({ id, label }: { id: string; label: string }) {
  return <RemoveButton action={removeClosedDateAction} id={id} label={label} />
}
