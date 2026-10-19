'use client'

import { useId, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { RECORD_LIMITS } from '../../../../domain/record/record-limits'
import { createRecordAction, editRecordStudyAction } from '../../actions/record-actions'
import { STUDY_FORM_LABELS } from '../../constants/record-strings'
import { studyFormStyles as STYLES } from './StudyForm.styles'
import type { StudyFormProps } from './StudyForm.types'

export function StudyForm({ clientId, mode, initial, techniques, onClose }: StudyFormProps) {
  const router = useRouter()
  const fieldId = useId()
  const [studyText, setStudyText] = useState(initial.studyText)
  const [techniqueId, setTechniqueId] = useState(initial.recommendedTechniqueId ?? '')
  const [failure, setFailure] = useState<{ error: string; problems: string[] } | null>(null)
  const [isSaving, startSaving] = useTransition()

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startSaving(async () => {
      const input = { studyText, recommendedTechniqueId: techniqueId || null }
      const result = mode === 'create'
        ? await createRecordAction(clientId, input)
        : await editRecordStudyAction(clientId, input)
      if (!result.ok) {
        setFailure({ error: result.error, problems: result.problems })
        if (result.saved) router.refresh()
        return
      }
      onClose()
      router.refresh()
    })
  }

  return (
    <form onSubmit={save} className={STYLES.form}>
      <div className={STYLES.field}>
        <label htmlFor={`${fieldId}-study`} className={STYLES.label}>{STUDY_FORM_LABELS.studyText}</label>
        <textarea id={`${fieldId}-study`} value={studyText} onChange={(event) => setStudyText(event.target.value)}
          rows={6} maxLength={RECORD_LIMITS.studyTextMaxLength} required autoFocus className={STYLES.input} />
      </div>
      <div className={STYLES.field}>
        <label htmlFor={`${fieldId}-technique`} className={STYLES.label}>{STUDY_FORM_LABELS.technique}</label>
        <select id={`${fieldId}-technique`} value={techniqueId} onChange={(event) => setTechniqueId(event.target.value)}
          className={STYLES.input}>
          <option value="">{STUDY_FORM_LABELS.noTechniqueOption}</option>
          {techniques.map((technique) => <option key={technique.id} value={technique.id}>{technique.name}</option>)}
        </select>
      </div>
      {failure ? (
        <div role="alert" className={STYLES.alert}>
          <p>{failure.error}</p>
          {failure.problems.length > 0 ? (
            <ul className={STYLES.problems}>
              {failure.problems.map((problem) => <li key={problem}>{problem}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className={STYLES.actions}>
        <button type="button" onClick={onClose} disabled={isSaving} className={STYLES.cancelButton}>
          {STUDY_FORM_LABELS.cancel}
        </button>
        <button type="submit" disabled={isSaving} className={STYLES.saveButton}>
          {isSaving ? STUDY_FORM_LABELS.saving : STUDY_FORM_LABELS.save}
        </button>
      </div>
    </form>
  )
}
