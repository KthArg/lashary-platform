'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { schedulingMessages } from '../../messages'
import { MAX_MANUAL_BLOCK_REASON_LENGTH } from '../../../domain/manual-blocks.constants'
import { availabilityStyles as STYLES } from '../styles/availability.styles'
import {
  initialAvailabilityActionState,
  type AvailabilityActionState,
} from '../types/availability-action-state'
import {
  addClosedDateAction,
  addManualBlockAction,
  addWeeklyBlockAction,
  removeClosedDateAction,
  removeManualBlockAction,
  removeWeeklyBlockAction,
} from '../actions/availability-actions'

const availabilityMessages = schedulingMessages.availability

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
          <p className={STYLES.feedbackTitle}>{availabilityMessages.validationTitle}</p>
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
      {state.link && (
        <Link href={state.link.href} className={STYLES.alertLink}>
          {state.link.label}
        </Link>
      )}
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
        <Field label={availabilityMessages.weekly.weekdayLabel}>
          <select name="weekday" className={STYLES.select} defaultValue="1" required>
            {availabilityMessages.weekdays.map((day, index) => (
              <option key={day} value={index + 1}>
                {day}
              </option>
            ))}
          </select>
        </Field>
        <Field label={availabilityMessages.weekly.startLabel}>
          <input type="time" name="start" className={STYLES.input} required />
        </Field>
        <Field label={availabilityMessages.weekly.endLabel}>
          <input type="time" name="end" className={STYLES.input} required />
        </Field>
        <button type="submit" className={STYLES.submit} disabled={pending}>
          {availabilityMessages.weekly.submit}
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
        <Field label={availabilityMessages.closed.dateLabel}>
          <input type="date" name="date" className={STYLES.input} required />
        </Field>
        <Field label={availabilityMessages.closed.kindLabel}>
          <select name="kind" className={STYLES.select} defaultValue="holiday" required>
            {Object.entries(availabilityMessages.closed.kinds).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={availabilityMessages.closed.labelLabel}>
          <input type="text" name="label" className={STYLES.input} placeholder={availabilityMessages.closed.labelPlaceholder} />
        </Field>
        <button type="submit" className={STYLES.submit} disabled={pending}>
          {availabilityMessages.closed.submit}
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
        <Field label={availabilityMessages.blocks.dateLabel}>
          <input type="date" name="date" className={STYLES.input} required />
        </Field>
        <Field label={availabilityMessages.blocks.startLabel}>
          <input type="time" name="start" className={STYLES.input} required />
        </Field>
        <Field label={availabilityMessages.blocks.endLabel}>
          <input type="time" name="end" className={STYLES.input} required />
        </Field>
        <Field label={availabilityMessages.blocks.reasonLabel}>
          <input type="text" name="reason" maxLength={MAX_MANUAL_BLOCK_REASON_LENGTH} className={STYLES.input} />
        </Field>
        <button type="submit" className={STYLES.submit} disabled={pending}>
          {availabilityMessages.blocks.submit}
        </button>
      </form>
      <AvailabilityFeedback state={state} />
    </>
  )
}

// Botón de quitar o reabrir con su propio estado: si la fila ya no existe, el aviso aparece junto a
// ella. El texto visible está contenido en el nombre accesible (WCAG 2.5.3).
function RemoveButton({ action, id, label, text }: { action: Action; id: string; label: string; text: string }) {
  const [state, formAction, pending] = useFormAction(action)
  return (
    <>
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className={STYLES.removeButton} aria-label={label} disabled={pending}>
          {text}
        </button>
      </form>
      {state.status !== 'ok' && state.status !== 'idle' && (
        <div className={STYLES.removeFeedback}>
          <AvailabilityFeedback state={state} />
        </div>
      )}
    </>
  )
}

export function RemoveWeeklyBlockButton({ id, label }: { id: string; label: string }) {
  return <RemoveButton action={removeWeeklyBlockAction} id={id} label={label} text={availabilityMessages.remove} />
}

export function RemoveClosedDateButton({ id, label }: { id: string; label: string }) {
  return <RemoveButton action={removeClosedDateAction} id={id} label={label} text={availabilityMessages.closed.reopen} />
}

export function RemoveManualBlockButton({ id, label }: { id: string; label: string }) {
  return <RemoveButton action={removeManualBlockAction} id={id} label={label} text={availabilityMessages.blocks.unblock} />
}
