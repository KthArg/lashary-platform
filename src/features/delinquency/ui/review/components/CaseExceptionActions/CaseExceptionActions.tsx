'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { liftCaseAction, forgiveCaseAction } from '@/features/delinquency/ui/review/actions/review-actions'
import { reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { FeedbackMessage, type Feedback } from '../FeedbackMessage'
import { caseExceptionActionsStyles as STYLES } from './CaseExceptionActions.styles'
import type { CaseExceptionActionsProps } from './CaseExceptionActions.types'

type Mode = 'idle' | 'lift' | 'forgive'

export function CaseExceptionActions({ caseId, pending }: CaseExceptionActionsProps) {
  const [mode, setMode] = useState<Mode>('idle')
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)

  const open = (next: Mode) => {
    setMode(next)
    setReason('')
    setAmount('')
    setFeedback(null)
  }

  const cancel = () => {
    setMode('idle')
    setFeedback(null)
  }

  const submitLift = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startTransition(async () => {
      const result = await liftCaseAction({ caseId, reason })
      if (!result.ok) {
        setFeedback({ kind: 'error', text: result.error })
        return
      }
      setFeedback({ kind: 'ok', text: copy.lift.notice })
      setMode('idle')
    })
  }

  const submitForgive = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startTransition(async () => {
      const result = await forgiveCaseAction({
        caseId,
        amount: amount.trim() === '' ? Number.NaN : Number(amount),
        reason,
      })
      if (!result.ok) {
        setFeedback({ kind: 'error', text: result.error })
        return
      }
      setFeedback({ kind: 'ok', text: copy.forgive.notice })
      setMode('idle')
    })
  }

  const reasonId = `delinquency-exception-reason-${caseId}`
  const amountId = `delinquency-exception-amount-${caseId}`

  if (mode === 'idle') {
    return (
      <div>
        <div className={STYLES.actions}>
          <button type="button" className={STYLES.liftButton} onClick={() => open('lift')}>
            {copy.lift.button}
          </button>
          <button type="button" className={STYLES.forgiveButton} onClick={() => open('forgive')}>
            {copy.forgive.button}
          </button>
        </div>
        <FeedbackMessage feedback={feedback} />
      </div>
    )
  }

  if (mode === 'lift') {
    return (
      <form onSubmit={submitLift} className={STYLES.form}>
        <p className={STYLES.hint}>{copy.lift.hint}</p>
        <div className={STYLES.field}>
          <label htmlFor={reasonId} className={STYLES.label}>
            {copy.lift.reasonLabel}
          </label>
          <textarea
            id={reasonId}
            className={STYLES.textarea}
            value={reason}
            disabled={isPending}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className={STYLES.formActions}>
          <button type="submit" className={STYLES.confirmButton} disabled={isPending}>
            {isPending ? copy.saving : copy.lift.confirm}
          </button>
          <button type="button" className={STYLES.cancelButton} disabled={isPending} onClick={cancel}>
            {copy.lift.cancel}
          </button>
        </div>
        <FeedbackMessage feedback={feedback} />
      </form>
    )
  }

  return (
    <form onSubmit={submitForgive} className={STYLES.form}>
      <p className={STYLES.hint}>{copy.forgive.hint}</p>
      <div className={STYLES.field}>
        <label htmlFor={amountId} className={STYLES.label}>
          {copy.forgive.amountLabel}
        </label>
        <input
          id={amountId}
          type="number"
          inputMode="numeric"
          min={1}
          max={pending}
          step={1}
          value={amount}
          disabled={isPending}
          onChange={(event) => setAmount(event.target.value)}
          className={STYLES.input}
        />
      </div>
      <label className={STYLES.checkboxField}>
        <input type="checkbox" checked={amount === String(pending)} onChange={() => setAmount(String(pending))} />
        {copy.forgive.forgiveAllLabel}
      </label>
      <div className={STYLES.field}>
        <label htmlFor={reasonId} className={STYLES.label}>
          {copy.forgive.reasonLabel}
        </label>
        <textarea
          id={reasonId}
          className={STYLES.textarea}
          value={reason}
          disabled={isPending}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <div className={STYLES.formActions}>
        <button type="submit" className={STYLES.confirmButton} disabled={isPending}>
          {isPending ? copy.saving : copy.forgive.confirm}
        </button>
        <button type="button" className={STYLES.cancelButton} disabled={isPending} onClick={cancel}>
          {copy.forgive.cancel}
        </button>
      </div>
      <FeedbackMessage feedback={feedback} />
    </form>
  )
}
