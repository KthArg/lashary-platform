'use client'

import { useState, useTransition } from 'react'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { EXCEPTION_REASON_MAX_LENGTH, FORGIVE_AMOUNT_MIN } from '@/features/delinquency/domain/delinquency-case'
import { forgiveCaseAction, liftCaseAction } from '@/features/delinquency/ui/review/actions/review-actions'
import { reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { FeedbackMessage, type Feedback } from '../FeedbackMessage'
import { caseExceptionActionsStyles as STYLES } from './CaseExceptionActions.styles'
import type { CaseExceptionActionsProps } from './CaseExceptionActions.types'

const money = (colones: number): string => formatMoney(moneyFromColones(colones))

export function CaseExceptionActions({ caseId, pending }: CaseExceptionActionsProps) {
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)

  const forgivesFullBalance = amount === String(pending)
  const reasonId = `delinquency-exception-reason-${caseId}`
  const amountId = `delinquency-exception-amount-${caseId}`

  const toggleForgiveFullBalance = () => {
    setAmount(forgivesFullBalance ? '' : String(pending))
  }

  const lift = () => {
    setFeedback(null)
    startTransition(async () => {
      const result = await liftCaseAction({ caseId, reason })
      if (!result.ok) {
        setFeedback({ kind: 'error', text: result.error })
        return
      }
      setReason('')
      setFeedback({ kind: 'ok', text: copy.exception.liftedNotice })
    })
  }

  const forgive = () => {
    setFeedback(null)
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
      setAmount('')
      setReason('')
      setFeedback({
        kind: 'ok',
        text: result.state === 'forgiven' ? copy.exception.forgivenNotice : copy.exception.partialForgiveNotice,
      })
    })
  }

  return (
    <div className={STYLES.wrapper}>
      <p className={STYLES.hint}>{copy.exception.hint}</p>

      <div className={STYLES.field}>
        <label htmlFor={reasonId} className={STYLES.label}>
          {copy.exception.reasonLabel}
        </label>
        <textarea
          id={reasonId}
          value={reason}
          maxLength={EXCEPTION_REASON_MAX_LENGTH}
          disabled={isPending}
          onChange={(event) => setReason(event.target.value)}
          className={STYLES.textarea}
        />
      </div>

      <div className={STYLES.actionsRow}>
        <div className={STYLES.field}>
          <label htmlFor={amountId} className={STYLES.label}>
            {copy.exception.amountLabel}
          </label>
          <input
            id={amountId}
            type="number"
            inputMode="numeric"
            min={FORGIVE_AMOUNT_MIN}
            max={pending}
            step={1}
            value={amount}
            disabled={isPending}
            onChange={(event) => setAmount(event.target.value)}
            className={STYLES.amountInput}
          />
        </div>

        <label className={STYLES.checkboxLabel}>
          <input
            type="checkbox"
            checked={forgivesFullBalance}
            disabled={isPending}
            onChange={toggleForgiveFullBalance}
            className={STYLES.checkbox}
          />
          {copy.exception.forgiveAllLabel(money(pending))}
        </label>

        <button
          type="button"
          className={STYLES.forgiveButton}
          disabled={isPending || reason.trim() === '' || amount.trim() === ''}
          onClick={forgive}
        >
          {isPending ? copy.saving : copy.exception.forgiveButton}
        </button>

        <button
          type="button"
          className={STYLES.liftButton}
          disabled={isPending || reason.trim() === ''}
          onClick={lift}
        >
          {isPending ? copy.saving : copy.exception.liftButton}
        </button>
      </div>

      <FeedbackMessage feedback={feedback} />
    </div>
  )
}
