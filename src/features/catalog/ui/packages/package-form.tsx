'use client'

import { useActionState, useMemo, useState } from 'react'
import type { TechniqueView } from '../../domain/technique'
import type { PackageListItem } from '../../application/packages/queries'
import { packageMessages } from './messages'
import {
  createPackageAction,
  updatePackageAction,
  deactivatePackageAction,
} from './package-actions'
import { initialPackageActionState } from './action-state'
import { packageFormStyles as STYLES } from './package-form.styles'

const f = packageMessages.form
const admin = packageMessages.admin

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
      <div role="status" className={STYLES.alertSuccess}>
        <span>{message}</span>
      </div>
    )
  }
  if (status === 'forbidden') {
    return (
      <div role="alert" className={STYLES.alertWarning}>
        <span>{message}</span>
      </div>
    )
  }
  return (
    <div role="alert" className={STYLES.alertError}>
      <div>
        <p className={STYLES.feedbackTitle}>{f.validationTitle}</p>
        <ul className={STYLES.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function PackageForm({
  pkg,
  techniques,
}: {
  pkg?: PackageListItem
  techniques: TechniqueView[]
}) {
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
    () => new Map(techniques.map((t) => [t.id, t.durationFirstTimeMin + t.bufferMin])),
    [techniques],
  )
  const totalDuration = useMemo(
    () =>
      Array.from(selectedIds).reduce((sum, id) => sum + (durationById.get(id) ?? 0), 0),
    [selectedIds, durationById],
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
      <h2 className={STYLES.heading}>{editing ? f.legendEdit : f.legendCreate}</h2>

      <Feedback {...state} />

      <form action={formAction} className={STYLES.form}>
        {editing && <input type="hidden" name="id" value={pkg.id} />}

        <label className={STYLES.fieldLabel} htmlFor="name">
          <span className={STYLES.labelText}>{f.fields.name}</span>
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
          <legend className={STYLES.labelText}>{f.fields.techniques}</legend>
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
              </label>
            ))}
          </div>
        </fieldset>

        <p className={STYLES.durationTotal}>
          {f.durationTotal}: {totalDuration} {admin.minutesShort}
        </p>

        <label className={STYLES.fieldLabel} htmlFor="price">
          <span className={STYLES.labelText}>{f.fields.price}</span>
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
            {editing ? f.submitEdit : f.submitCreate}
          </button>
        </div>
      </form>

      {editing && (
        <form action={deactivateAction} className={STYLES.deactivateForm}>
          <input type="hidden" name="id" value={pkg.id} />
          <Feedback {...deactivateState} />
          <button type="submit" className={STYLES.deactivateButton} disabled={deactivating}>
            {admin.rowActions.deactivate}
          </button>
        </form>
      )}
    </section>
  )
}
