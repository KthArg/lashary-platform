'use client'

import { useActionState, useMemo, useState } from 'react'
import { packageMessages } from '../../constants/package-strings'
import {
  createPackageAction,
  updatePackageAction,
  deactivatePackageAction,
} from '../../actions/package-actions'
import { initialPackageActionState } from '../../types/package-action-state'
import { packageFormStyles as STYLES } from './PackageForm.styles'
import { PackageFormFeedback } from '../PackageFormFeedback'
import type { PackageFormProps } from './PackageForm.types'

const formMessages = packageMessages.form
const admin = packageMessages.admin

export function PackageForm({ pkg, techniques }: PackageFormProps) {
  const editing = pkg !== undefined
  const [state, formAction, pending] = useActionState(
    editing ? updatePackageAction : createPackageAction,
    initialPackageActionState,
  )
  const [deactivateState, deactivateAction, deactivating] = useActionState(
    deactivatePackageAction,
    initialPackageActionState,
  )

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(pkg?.techniqueIds ?? []),
  )

  const durationById = useMemo(
    () => new Map(techniques.map((technique) => [technique.id, technique.durationFirstTimeMin + technique.bufferMin])),
    [techniques],
  )
  const totalDuration = useMemo(
    () =>
      Array.from(selectedIds).reduce((sum, id) => sum + (durationById.get(id) ?? 0), 0),
    [selectedIds, durationById],
  )

  const hasInactiveSelected = techniques.some(
    (technique) => !technique.isActive && selectedIds.has(technique.id),
  )

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className={STYLES.section}>
      <h2 className={STYLES.heading}>{editing ? formMessages.legendEdit : formMessages.legendCreate}</h2>

      <PackageFormFeedback {...state} />

      <form action={formAction} className={STYLES.form}>
        {editing && <input type="hidden" name="id" value={pkg.id} />}

        <label className={STYLES.fieldLabel} htmlFor="name">
          <span className={STYLES.labelText}>{formMessages.fields.name}</span>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={pkg?.name}
            className={STYLES.fieldInput}
          />
        </label>

        <fieldset className={STYLES.techniquesFieldset}>
          <legend className={STYLES.labelText}>{formMessages.fields.techniques}</legend>
          <div className={STYLES.techniquesList}>
            {techniques.map((technique) => (
              <label key={technique.id} className={STYLES.techniqueOption}>
                <input
                  type="checkbox"
                  name="techniqueIds"
                  value={technique.id}
                  checked={selectedIds.has(technique.id)}
                  onChange={() => toggle(technique.id)}
                  className={STYLES.checkbox}
                />
                <span>
                  {technique.name} ({technique.durationFirstTimeMin + technique.bufferMin}{' '}
                  {admin.minutesShort})
                </span>
                {!technique.isActive && (
                  <span className={STYLES.inactiveBadge}>{formMessages.inactiveTechnique}</span>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        {hasInactiveSelected && <p className={STYLES.alertWarning}>{formMessages.inactiveHint}</p>}

        <p className={STYLES.durationTotal}>
          {formMessages.durationTotal}: {totalDuration} {admin.minutesShort}
        </p>

        <label className={STYLES.fieldLabel} htmlFor="price">
          <span className={STYLES.labelText}>{formMessages.fields.price}</span>
          <input
            id="price"
            name="price"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={pkg?.price}
            className={STYLES.fieldInput}
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
          <input type="hidden" name="id" value={pkg.id} />
          <PackageFormFeedback {...deactivateState} />
          <button type="submit" className={STYLES.deactivateButton} disabled={deactivating}>
            {admin.rowActions.deactivate}
          </button>
        </form>
      )}
    </section>
  )
}
