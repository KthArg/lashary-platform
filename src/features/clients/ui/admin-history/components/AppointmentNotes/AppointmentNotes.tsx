'use client'

import { useId, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { NOTE_LIMITS } from '@/features/clients/domain/notes/note-limits'
import { ConfirmDialog } from '@/features/clients/ui/shared/components/ConfirmDialog'
import type { AppointmentNoteView } from '@/features/clients/application/notes/notes-by-appointment'
import { addNoteAction, deleteNoteAction, editNoteAction } from '../../actions/note-actions'
import { NOTE_LABELS } from '../../constants/history-strings'
import { formatAppointmentDate } from '../../format-appointment-date'
import { noteDatesText } from '../../note-dates-text'
import type { NoteActionResult } from '../../types/history-results'
import { appointmentNotesStyles as STYLES } from './AppointmentNotes.styles'
import type { AppointmentNotesProps, NoteDraft } from './AppointmentNotes.types'

export function AppointmentNotes({ clientId, appointmentId, notes }: AppointmentNotesProps) {
  const router = useRouter()
  const fieldId = useId()
  const [draft, setDraft] = useState<NoteDraft | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<AppointmentNoteView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  const openForm = (nextDraft: NoteDraft) => {
    setError(null)
    setDraft(nextDraft)
  }

  const changeBody = (body: string) => {
    if (draft === null) return
    setError(null)
    setDraft({ ...draft, body })
  }

  const closeForm = () => {
    setDraft(null)
    setError(null)
  }

  const run = (save: () => Promise<NoteActionResult>, onSaved: () => void) => {
    startSaving(async () => {
      const result = await save()
      if (!result.ok) {
        setError(result.error)
        return
      }
      onSaved()
      router.refresh()
    })
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (draft === null) return
    const { noteId, body } = draft
    run(
      () => (noteId === null ? addNoteAction(clientId, appointmentId, body) : editNoteAction(clientId, noteId, body)),
      closeForm,
    )
  }

  const confirmRemoval = () => {
    if (pendingRemoval === null) return
    const noteId = pendingRemoval.id
    setPendingRemoval(null)
    run(() => deleteNoteAction(clientId, noteId), () => setError(null))
  }

  return (
    <div className={STYLES.notes}>
      {notes.length === 0 ? (
        <p className={STYLES.empty}>{NOTE_LABELS.empty}</p>
      ) : (
        <ul className={STYLES.list}>
          {notes.map((note) => {
            const createdAt = formatAppointmentDate(note.createdAtMs)
            return (
              <li key={note.id} className={STYLES.item}>
                <p className={STYLES.body}>{note.body}</p>
                <p className={STYLES.dates}>{noteDatesText(note)}</p>
                <div className={STYLES.itemActions}>
                  <button type="button" disabled={isSaving} onClick={() => openForm({ noteId: note.id, body: note.body })}
                    aria-label={NOTE_LABELS.editButton(createdAt)} className={STYLES.textButton}>
                    {NOTE_LABELS.edit}
                  </button>
                  <button type="button" disabled={isSaving} onClick={() => setPendingRemoval(note)}
                    aria-label={NOTE_LABELS.removeButton(createdAt)} className={STYLES.textButton}>
                    {NOTE_LABELS.remove}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {draft === null ? (
        <button type="button" disabled={isSaving} onClick={() => openForm({ noteId: null, body: '' })} className={STYLES.textButton}>
          {NOTE_LABELS.add}
        </button>
      ) : (
        <form onSubmit={submit} className={STYLES.form}>
          <label htmlFor={fieldId} className={STYLES.fieldLabel}>
            {draft.noteId === null ? NOTE_LABELS.newField : NOTE_LABELS.editField}
          </label>
          <textarea id={fieldId} value={draft.body} onChange={(event) => changeBody(event.target.value)}
            maxLength={NOTE_LIMITS.bodyMaxLength} rows={3} required autoFocus className={STYLES.input} />
          <div className={STYLES.actions}>
            <button type="button" onClick={closeForm} disabled={isSaving} className={STYLES.cancelButton}>{NOTE_LABELS.cancel}</button>
            <button type="submit" disabled={isSaving} className={STYLES.saveButton}>
              {isSaving ? NOTE_LABELS.saving : NOTE_LABELS.save}
            </button>
          </div>
        </form>
      )}

      {error ? <p role="alert" className={STYLES.alert}>{error}</p> : null}

      <ConfirmDialog
        isOpen={pendingRemoval !== null}
        title={NOTE_LABELS.confirmTitle}
        message={NOTE_LABELS.confirmMessage}
        confirmLabel={NOTE_LABELS.remove}
        cancelLabel={NOTE_LABELS.cancel}
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  )
}
