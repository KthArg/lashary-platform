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
import { techniqueFormStyles as STYLES } from './TechniqueForm.styles'
import { TechniqueFormField } from '../TechniqueFormField'
import { TechniqueFormFeedback } from '../TechniqueFormFeedback'
import type { TechniqueFormProps } from './TechniqueForm.types'

const formMessages = catalogMessages.form

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
    <section className={STYLES.section}>
      <h2 className={STYLES.heading}>
        {editing ? formMessages.legendEdit : formMessages.legendCreate}
      </h2>

      <TechniqueFormFeedback {...state} />

      <form action={formAction} className={STYLES.form}>
        {editing && <input type="hidden" name="id" value={technique.id} />}

        <TechniqueFormField name="name" label={formMessages.fields.name} defaultValue={technique?.name} required />

        <label className={STYLES.fieldLabel} htmlFor="family">
          <span className={STYLES.labelText}>{formMessages.fields.family}</span>
          <select
            id="family"
            name="family"
            defaultValue={technique?.family ?? SERVICE_FAMILIES[0]}
            className={STYLES.select}
          >
            {SERVICE_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {familyLabel(family)}
              </option>
            ))}
          </select>
        </label>

        <TechniqueFormField name="priceFirstTime" label={formMessages.fields.priceFirstTime} type="number" min={1} required defaultValue={technique?.priceFirstTime} />
        <TechniqueFormField name="priceRetouch" label={formMessages.fields.priceRetouch} type="number" min={1} defaultValue={technique?.priceRetouch ?? ''} />
        <TechniqueFormField name="durationFirstTimeMin" label={formMessages.fields.durationFirstTimeMin} type="number" min={1} required defaultValue={technique?.durationFirstTimeMin} />
        <TechniqueFormField name="durationRetouchMin" label={formMessages.fields.durationRetouchMin} type="number" min={1} defaultValue={technique?.durationRetouchMin ?? ''} />
        <TechniqueFormField name="bufferMin" label={formMessages.fields.bufferMin} type="number" min={0} required defaultValue={technique?.bufferMin ?? 0} />
        <TechniqueFormField name="reapplicationIntervalDays" label={formMessages.fields.reapplicationIntervalDays} type="number" min={1} defaultValue={technique?.reapplicationIntervalDays ?? ''} />
        <TechniqueFormField name="deposit" label={formMessages.fields.deposit} type="number" min={0} required defaultValue={technique?.deposit ?? 0} />

        <label className={STYLES.aftercareLabel} htmlFor="aftercareText">
          <span className={STYLES.labelText}>{formMessages.fields.aftercareText}</span>
          <textarea
            id="aftercareText"
            name="aftercareText"
            required
            rows={3}
            defaultValue={technique?.aftercareText}
            className={STYLES.textarea}
          />
        </label>

        <div className={STYLES.submitWrapper}>
          <button type="submit" className={STYLES.submitButton} disabled={pending}>
            {editing ? formMessages.submitEdit : formMessages.submitCreate}
          </button>
        </div>
      </form>

      {editing && (
        <form action={deactivateAction} className={STYLES.deactivateForm}>
          <input type="hidden" name="id" value={technique.id} />
          <TechniqueFormFeedback {...deactivateState} />
          <button type="submit" className={STYLES.deactivateButton} disabled={deactivating}>
            {catalogMessages.admin.rowActions.deactivate}
          </button>
        </form>
      )}
    </section>
  )
}
