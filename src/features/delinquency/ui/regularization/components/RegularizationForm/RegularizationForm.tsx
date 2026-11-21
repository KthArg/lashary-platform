'use client'

import { useActionState, useId } from 'react'
import { RECEIPT_MAX_BYTES } from '@/features/delinquency/domain/receipt'
import { REFERENCE_MAX_LENGTH } from '@/features/delinquency/domain/regularization'
import { submitRegularizationAction } from '../../actions/regularization-actions'
import {
  RECEIPT_ACCEPT,
  REGULARIZATION_FIELDS as FIELDS,
  receiptProblemMessages,
  regularizationFormMessages as COPY,
} from '../../constants/regularization-strings'
import { regularizationFormStyles as STYLES } from './RegularizationForm.styles'
import type { RegularizationFormProps } from './RegularizationForm.types'

export function RegularizationForm({ caseId, maxAmount, hasPendingRequest }: RegularizationFormProps) {
  const id = useId()
  const [result, send, sending] = useActionState(submitRegularizationAction, null)

  return (
    <form action={send} className={STYLES.form}>
      <fieldset className={STYLES.fieldset} disabled={sending}>
        <legend className={STYLES.legend}>{COPY.legend}</legend>
        <input type="hidden" name={FIELDS.caseId} value={caseId} />

        <label htmlFor={`${id}-amount`} className={STYLES.label}>
          {COPY.amountLabel}
        </label>
        <input
          id={`${id}-amount`}
          name={FIELDS.declaredAmount}
          type="number"
          inputMode="numeric"
          min={1}
          max={maxAmount}
          step={1}
          required
          className={STYLES.input}
        />

        <label htmlFor={`${id}-reference`} className={STYLES.label}>
          {COPY.referenceLabel}
        </label>
        <input
          id={`${id}-reference`}
          name={FIELDS.reference}
          type="text"
          maxLength={REFERENCE_MAX_LENGTH}
          className={STYLES.input}
        />

        <label htmlFor={`${id}-receipt`} className={STYLES.label}>
          {COPY.receiptLabel}
        </label>
        <input
          id={`${id}-receipt`}
          name={FIELDS.receipt}
          type="file"
          accept={RECEIPT_ACCEPT}
          required
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.setCustomValidity(
              file && file.size > RECEIPT_MAX_BYTES ? receiptProblemMessages['receipt-too-large'] : '',
            )
            event.currentTarget.reportValidity()
          }}
          aria-describedby={hasPendingRequest ? `${id}-replace` : undefined}
          className={STYLES.fileInput}
        />

        {hasPendingRequest && (
          <p id={`${id}-replace`} className={STYLES.hint}>
            {COPY.replaceHint}
          </p>
        )}
        <button type="submit" className={STYLES.submit}>
          {sending ? COPY.sending : COPY.submit}
        </button>
      </fieldset>
      {result && (
        <div role={result.ok ? 'status' : 'alert'} className={result.ok ? STYLES.alertOk : STYLES.alertError}>
          <span>{result.message}</span>
        </div>
      )}
    </form>
  )
}
