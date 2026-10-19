'use client'

import { useState } from 'react'
import { RECORD_LABELS, STUDY_FORM_LABELS } from '../../constants/record-strings'
import { StudyForm } from '../StudyForm'
import { studyEditorStyles as STYLES } from './StudyEditor.styles'
import type { RecommendedTechnique } from '../../../../domain/record/record.types'
import type { StudyEditorProps } from './StudyEditor.types'

function optionsWithCurrent(techniques: readonly RecommendedTechnique[], current: RecommendedTechnique | null) {
  if (current === null || techniques.some((technique) => technique.id === current.id)) return techniques
  return [current, ...techniques]
}

export function StudyEditor({ clientId, study, techniques }: StudyEditorProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (isEditing) {
    return (
      <StudyForm
        clientId={clientId}
        mode={study ? 'edit' : 'create'}
        initial={{ studyText: study?.studyText ?? '', recommendedTechniqueId: study?.recommendedTechnique?.id ?? null }}
        techniques={optionsWithCurrent(techniques, study?.recommendedTechnique ?? null)}
        onClose={() => setIsEditing(false)}
      />
    )
  }

  if (study === null) {
    return (
      <div className={STYLES.empty}>
        <p>{RECORD_LABELS.emptyRecord}</p>
        <button type="button" onClick={() => setIsEditing(true)} className={STYLES.button}>
          {STUDY_FORM_LABELS.createButton}
        </button>
      </div>
    )
  }

  return (
    <div className={STYLES.study}>
      <p className={STYLES.studyText}>{study.studyText}</p>
      <dl className={STYLES.technique}>
        <dt className={STYLES.label}>{RECORD_LABELS.recommendedTechnique}</dt>
        <dd>{study.recommendedTechnique?.name ?? RECORD_LABELS.noRecommendedTechnique}</dd>
      </dl>
      <button type="button" onClick={() => setIsEditing(true)} className={STYLES.button}>
        {STUDY_FORM_LABELS.editButton}
      </button>
    </div>
  )
}
