'use client'

import { useActionState } from 'react'
import { SERVICE_FAMILIES } from '../../../../domain/techniques/technique'
import { catalogMessages, familyLabel } from '../../constants/technique-strings'
import {
  createTechniqueAction,
  updateTechniqueAction,
  deactivateTechniqueAction,
} from '../../actions/technique-actions'
import { initialActionState } from '../../types/technique-action-state'
import { techniqueFormStyles as s } from './TechniqueForm.styles'
import { TechniqueFormField } from '../TechniqueFormField'
import { TechniqueFormFeedback } from '../TechniqueFormFeedback'
import type { TechniqueFormProps } from './TechniqueForm.types'

const f = catalogMessages.form

export function TechniqueForm({ technique }: TechniqueFormProps) {
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

      <TechniqueFormFeedback {...state} />

      <form action={formAction} className={s.form}>
        {editing && <input type="hidden" name="id" value={technique.id} />}

        <TechniqueFormField name="name" label={f.fields.name} defaultValue={technique?.name} required />

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

        <TechniqueFormField name="priceFirstTime" label={f.fields.priceFirstTime} type="number" min={1} required defaultValue={technique?.priceFirstTime} />
        <TechniqueFormField name="priceRetouch" label={f.fields.priceRetouch} type="number" min={1} defaultValue={technique?.priceRetouch ?? ''} />
        <TechniqueFormField name="durationFirstTimeMin" label={f.fields.durationFirstTimeMin} type="number" min={1} required defaultValue={technique?.durationFirstTimeMin} />
        <TechniqueFormField name="durationRetouchMin" label={f.fields.durationRetouchMin} type="number" min={1} defaultValue={technique?.durationRetouchMin ?? ''} />
        <TechniqueFormField name="bufferMin" label={f.fields.bufferMin} type="number" min={0} required defaultValue={technique?.bufferMin ?? 0} />
        <TechniqueFormField name="reapplicationIntervalDays" label={f.fields.reapplicationIntervalDays} type="number" min={1} defaultValue={technique?.reapplicationIntervalDays ?? ''} />
        <TechniqueFormField name="deposit" label={f.fields.deposit} type="number" min={0} required defaultValue={technique?.deposit ?? 0} />

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
          <TechniqueFormFeedback {...deactivateState} />
          <button type="submit" className={s.deactivateButton} disabled={deactivating}>
            {catalogMessages.admin.rowActions.deactivate}
          </button>
        </form>
      )}
    </section>
  )
}
