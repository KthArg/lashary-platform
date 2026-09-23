'use client'

import { useActionState, useMemo, useState } from 'react'
import type { TechniqueView } from '../domain/technique'
import type { PackageListItem } from '../application/queries'
import { catalogMessages } from './messages'
import {
  createPackageAction,
  updatePackageAction,
  deactivatePackageAction,
} from './package-actions'
import { initialPackageActionState } from './action-state'
import { packageFormStyles as s } from './package-form.styles'

const f = catalogMessages.packages.form
const admin = catalogMessages.packages.admin

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
  if (status === 'forbidden') {
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

// Duración por técnica = duración de primera vez + preparación/limpieza (mismo cómputo que
// db/package-repository.ts usa para durationTotalMin, criterio 2). Se recalcula en el cliente
// a medida que se marcan/desmarcan técnicas, para que el ajuste manual del precio (criterio 2)
// se haga viendo el tiempo total real.
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
    <section className={s.section}>
      <h2 className={s.heading}>{editing ? f.legendEdit : f.legendCreate}</h2>

      <Feedback {...state} />

      <form action={formAction} className={s.form}>
        {editing && <input type="hidden" name="id" value={pkg.id} />}

        <label className={s.fieldLabel} htmlFor="name">
          <span className={s.labelText}>{f.fields.name}</span>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={pkg?.name}
            className={s.fieldInput}
          />
        </label>

        <fieldset className={s.techniquesFieldset}>
          <legend className={s.labelText}>{f.fields.techniques}</legend>
          <div className={s.techniquesList}>
            {techniques.map((technique) => (
              <label key={technique.id} className={s.techniqueOption}>
                <input
                  type="checkbox"
                  name="techniqueIds"
                  value={technique.id}
                  checked={selectedIds.has(technique.id)}
                  onChange={() => toggle(technique.id)}
                  className={s.checkbox}
                />
                <span>
                  {technique.name} ({technique.durationFirstTimeMin + technique.bufferMin}{' '}
                  {admin.minutesShort})
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className={s.durationTotal}>
          {f.durationTotal}: {totalDuration} {admin.minutesShort}
        </p>

        <label className={s.fieldLabel} htmlFor="price">
          <span className={s.labelText}>{f.fields.price}</span>
          <input
            id="price"
            name="price"
            type="number"
            min={1}
            step={1}
            required
            defaultValue={pkg?.price}
            className={s.fieldInput}
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
          <input type="hidden" name="id" value={pkg.id} />
          <Feedback {...deactivateState} />
          <button type="submit" className={s.deactivateButton} disabled={deactivating}>
            {admin.rowActions.deactivate}
          </button>
        </form>
      )}
    </section>
  )
}
