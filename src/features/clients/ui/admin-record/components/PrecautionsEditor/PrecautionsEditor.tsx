'use client'

import { useId, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { RECORD_LIMITS } from '../../../../domain/record/record-limits'
import { addRecordPrecautionAction, removeRecordPrecautionAction } from '../../actions/record-actions'
import { PRECAUTION_FORM_LABELS, RECORD_LABELS } from '../../constants/record-strings'
import { ConfirmDialog } from '../../../admin-clients/components/ConfirmDialog'
import { RecordIcon } from '../RecordIcon'
import { groupPrecautions } from '../../precaution-groups'
import { precautionsEditorStyles as STYLES } from './PrecautionsEditor.styles'
import type { Precaution } from '../../../../domain/record/record.types'
import type { SaveRecordResult } from '../../types/record-action-results'
import type { PrecautionsEditorProps } from './PrecautionsEditor.types'

export function PrecautionsEditor({ clientId, precautions, categories }: PrecautionsEditorProps) {
  const router = useRouter()
  const fieldId = useId()
  const [isAdding, setIsAdding] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<Precaution | null>(null)
  const [failure, setFailure] = useState<{ error: string; problems: string[] } | null>(null)
  const [isSaving, startSaving] = useTransition()

  const closeForm = () => {
    setIsAdding(false)
    setCategoryId('')
    setDescription('')
    setFailure(null)
  }

  const run = (save: () => Promise<SaveRecordResult>, onSaved: () => void) => {
    startSaving(async () => {
      const result = await save()
      if (!result.ok) {
        setFailure({ error: result.error, problems: result.problems })
        if (result.saved) router.refresh()
        return
      }
      onSaved()
      router.refresh()
    })
  }

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    run(() => addRecordPrecautionAction(clientId, { categoryId, description }), closeForm)
  }

  const confirmRemoval = () => {
    if (pendingRemoval === null) return
    const precautionId = pendingRemoval.id
    setPendingRemoval(null)
    run(() => removeRecordPrecautionAction(clientId, precautionId), () => setFailure(null))
  }

  return (
    <div className={STYLES.editor}>
      <header className={STYLES.header}>
        <h3 className={STYLES.title}><RecordIcon name="shield" className={STYLES.titleIcon} />{RECORD_LABELS.precautionsHeading}</h3>
        {isAdding ? null : (
          <button type="button" onClick={() => setIsAdding(true)} disabled={isSaving} className={STYLES.addButton}>
            <RecordIcon name="plus" className={STYLES.buttonIcon} />{PRECAUTION_FORM_LABELS.addButton}
          </button>
        )}
      </header>

      {isAdding ? (
        <form onSubmit={add} className={STYLES.form}>
          <div className={STYLES.field}>
            <label htmlFor={`${fieldId}-category`} className={STYLES.fieldLabel}>{PRECAUTION_FORM_LABELS.category}</label>
            <select id={`${fieldId}-category`} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}
              required autoFocus className={STYLES.input}>
              <option value="">{PRECAUTION_FORM_LABELS.chooseCategory}</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>
          <div className={STYLES.field}>
            <label htmlFor={`${fieldId}-description`} className={STYLES.fieldLabel}>{PRECAUTION_FORM_LABELS.description}</label>
            <input id={`${fieldId}-description`} value={description} onChange={(event) => setDescription(event.target.value)}
              maxLength={RECORD_LIMITS.precautionDescriptionMaxLength} required className={STYLES.input} />
          </div>
          <div className={STYLES.actions}>
            <button type="button" onClick={closeForm} disabled={isSaving} className={STYLES.cancelButton}>
              {PRECAUTION_FORM_LABELS.cancel}
            </button>
            <button type="submit" disabled={isSaving} className={STYLES.saveButton}>
              {isSaving ? PRECAUTION_FORM_LABELS.saving : PRECAUTION_FORM_LABELS.save}
            </button>
          </div>
        </form>
      ) : null}

      {failure ? (
        <div role="alert" className={STYLES.alert}>
          <p>{failure.error}</p>
          {failure.problems.length > 0 ? (
            <ul className={STYLES.problems}>{failure.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
          ) : null}
        </div>
      ) : null}

      <ul className={STYLES.groups}>
        {groupPrecautions(categories, precautions).map((group) => (
          <li key={group.categoryId} className={STYLES.group}>
            <h4 className={STYLES.groupTitle}><RecordIcon name={group.icon} className={STYLES.titleIcon} />{group.title}</h4>
            <p className={STYLES.count}>{PRECAUTION_FORM_LABELS.recordsCount(group.precautions.length)}</p>
            {group.precautions.length > 0 ? (
              <ul className={STYLES.items}>
                {group.precautions.map((precaution) => (
                  <li key={precaution.id} className={STYLES.item}>
                    <span>{precaution.description}</span>
                    <button type="button" disabled={isSaving} onClick={() => setPendingRemoval(precaution)} className={STYLES.textButton}
                      aria-label={PRECAUTION_FORM_LABELS.removeButton(precaution.categoryName, precaution.description)}>
                      {PRECAUTION_FORM_LABELS.remove}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {precautions.length === 0 ? (
        <div className={STYLES.empty}>
          <RecordIcon name="clipboard" className={STYLES.titleIcon} />
          <p className={STYLES.emptyTitle}>{RECORD_LABELS.noPrecautions}</p>
          <p className={STYLES.count}>{PRECAUTION_FORM_LABELS.emptyHint}</p>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={pendingRemoval !== null}
        title={PRECAUTION_FORM_LABELS.confirmTitle}
        message={pendingRemoval ? PRECAUTION_FORM_LABELS.confirmMessage(pendingRemoval.categoryName, pendingRemoval.description) : ''}
        confirmLabel={PRECAUTION_FORM_LABELS.remove}
        cancelLabel={PRECAUTION_FORM_LABELS.cancel}
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  )
}
