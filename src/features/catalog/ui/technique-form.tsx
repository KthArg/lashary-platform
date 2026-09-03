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
    <label className="form-control w-full" htmlFor={name}>
      <span className="label-text">{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        step={type === 'number' ? 1 : undefined}
        defaultValue={defaultValue ?? undefined}
        className="input input-bordered w-full"
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
      <div role="status" className="alert alert-success">
        <span>{message}</span>
      </div>
    )
  }
  if (status === 'disabled') {
    return (
      <div role="alert" className="alert alert-warning">
        <span>{message}</span>
      </div>
    )
  }
  return (
    <div role="alert" className="alert alert-error">
      <div>
        <p className="font-medium">{f.validationTitle}</p>
        <ul className="list-disc pl-5">
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
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-xl">
        {editing ? f.legendEdit : f.legendCreate}
      </h2>

      <Feedback {...state} />

      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        {editing && <input type="hidden" name="id" value={technique.id} />}

        <Field name="name" label={f.fields.name} defaultValue={technique?.name} required />

        <label className="form-control w-full" htmlFor="family">
          <span className="label-text">{f.fields.family}</span>
          <select
            id="family"
            name="family"
            defaultValue={technique?.family ?? SERVICE_FAMILIES[0]}
            className="select select-bordered w-full"
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

        <label className="form-control w-full sm:col-span-2" htmlFor="aftercareText">
          <span className="label-text">{f.fields.aftercareText}</span>
          <textarea
            id="aftercareText"
            name="aftercareText"
            required
            rows={3}
            defaultValue={technique?.aftercareText}
            className="textarea textarea-bordered w-full"
          />
        </label>

        <div className="sm:col-span-2">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {editing ? f.submitEdit : f.submitCreate}
          </button>
        </div>
      </form>

      {editing && (
        <form action={deactivateAction} className="flex flex-col gap-2 border-t border-base-300 pt-4">
          <input type="hidden" name="id" value={technique.id} />
          <Feedback {...deactivateState} />
          <button type="submit" className="btn btn-outline btn-error w-fit" disabled={deactivating}>
            {catalogMessages.admin.rowActions.deactivate}
          </button>
        </form>
      )}
    </section>
  )
}
