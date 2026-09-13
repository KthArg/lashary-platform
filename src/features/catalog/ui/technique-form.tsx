'use client'

import { useActionState } from 'react'
import type { TechniqueView } from '../domain/technique'
import { SERVICE_FAMILIES } from '../domain/technique'
import { catalogMessages, familyLabel } from './messages'
import {
  createTechniqueAction,
  updateTechniqueAction,
  deactivateTechniqueAction,
} from './actions'
import { initialActionState } from './action-state'
import { techniqueFormStyles as s } from './technique-form.styles'

const f = catalogMessages.form

type FieldProps = {
  name: string
  label: string
  defaultValue?: string | number | null
  type?: 'text' | 'number'
  required?: boolean
  min?: number
}

function Field({ name, label, defaultValue, type = 'text', required, min }: FieldProps) {
  return (
    <label className={s.fieldLabel} htmlFor={name}>
      <span className={s.labelText}>{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        step={type === 'number' ? 1 : undefined}
        defaultValue={defaultValue ?? undefined}
        className={s.fieldInput}
      />
    </label>
  )
}

function Feedback({
  status,
  message,
  problems,
}: {
  status: string
  message?: string
  problems?: string[]
}) {
  if (status === 'idle') return null
  if (status === 'ok') {
    return (
      <div role="status" className={s.alertSuccess}>
        <span>{message}</span>
      </div>
    )
  }
  if (status === 'disabled') {
    return (
      <div role="alert" className={s.alertWarning}>
        <span>{message}</span>
      </div>
    )
  }
  return (
    <div role="alert" className={s.alertError}>
      <div>
        <p className={s.feedbackTitle}>{f.validationTitle}</p>
        <ul className={s.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function TechniqueForm({ technique }: { technique?: TechniqueView }) {
  const editing = technique !== undefined
  const [state, formAction, pending] = useActionState(
    editing ? updateTechniqueAction : createTechniqueAction,
    initialActionState,
  )
  const [deactivateState, deactivateAction, deactivating] = useActionState(
    deactivateTechniqueAction,
    initialActionState,
  )

  return (
    <section className={s.section}>
      <h2 className={s.heading}>
        {editing ? f.legendEdit : f.legendCreate}
      </h2>

      <Feedback {...state} />

      <form action={formAction} className={s.form}>
        {editing && <input type="hidden" name="id" value={technique.id} />}

        <Field name="name" label={f.fields.name} defaultValue={technique?.name} required />

        <label className={s.fieldLabel} htmlFor="family">
          <span className={s.labelText}>{f.fields.family}</span>
          <select
            id="family"
            name="family"
            defaultValue={technique?.family ?? SERVICE_FAMILIES[0]}
            className={s.select}
          >
            {SERVICE_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {familyLabel(family)}
              </option>
            ))}
          </select>
        </label>

        <Field name="priceFirstTime" label={f.fields.priceFirstTime} type="number" min={1} required defaultValue={technique?.priceFirstTime} />
        <Field name="priceRetouch" label={f.fields.priceRetouch} type="number" min={1} defaultValue={technique?.priceRetouch ?? ''} />
        <Field name="durationFirstTimeMin" label={f.fields.durationFirstTimeMin} type="number" min={1} required defaultValue={technique?.durationFirstTimeMin} />
        <Field name="durationRetouchMin" label={f.fields.durationRetouchMin} type="number" min={1} defaultValue={technique?.durationRetouchMin ?? ''} />
        <Field name="bufferMin" label={f.fields.bufferMin} type="number" min={0} required defaultValue={technique?.bufferMin ?? 0} />
        <Field name="reapplicationIntervalDays" label={f.fields.reapplicationIntervalDays} type="number" min={1} defaultValue={technique?.reapplicationIntervalDays ?? ''} />
        <Field name="deposit" label={f.fields.deposit} type="number" min={0} required defaultValue={technique?.deposit ?? 0} />

        <label className={s.aftercareLabel} htmlFor="aftercareText">
          <span className={s.labelText}>{f.fields.aftercareText}</span>
          <textarea
            id="aftercareText"
            name="aftercareText"
            required
            rows={3}
            defaultValue={technique?.aftercareText}
            className={s.textarea}
          />
        </label>

        <div className={s.submitWrapper}>
          <button type="submit" className={s.submitButton} disabled={pending}>
            {editing ? f.submitEdit : f.submitCreate}
          </button>
        </div>
      </form>

      {editing && (
        <form action={deactivateAction} className={s.deactivateForm}>
          <input type="hidden" name="id" value={technique.id} />
          <Feedback {...deactivateState} />
          <button type="submit" className={s.deactivateButton} disabled={deactivating}>
            {catalogMessages.admin.rowActions.deactivate}
          </button>
        </form>
      )}
    </section>
  )
}
