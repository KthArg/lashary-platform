'use client'

import { useActionState, useId } from 'react'
import { CartEmpty } from '@/features/store/ui/cart/components/CartEmpty'
import { RECEIPT_MAX_BYTES } from '@/features/store/domain/receipt'
import { checkoutAction } from '../../actions/checkout-actions'
import {
  CHECKOUT_FIELDS as FIELDS,
  RECEIPT_ACCEPT,
  checkoutMessages as COPY,
  receiptProblemMessages,
} from '../../constants/checkout-strings'
import { checkoutFormStyles as STYLES } from './CheckoutForm.styles'
import type { CheckoutFormProps } from './CheckoutForm.types'

export function CheckoutForm({ totalLabel, isCartEmpty }: CheckoutFormProps) {
  const id = useId()
  const [result, send, sending] = useActionState(checkoutAction, null)

  if (isCartEmpty && !result?.ok) {
    return <CartEmpty />
  }

  if (result?.ok) {
    return (
      <div role="status" className={STYLES.alertOk}>
        <span>{result.message}</span>
      </div>
    )
  }

  return (
    <form action={send} className={STYLES.form}>
      <p className={STYLES.total}>{totalLabel}</p>
      <fieldset className={STYLES.fieldset} disabled={sending}>
        <legend className={STYLES.legend}>{COPY.legend}</legend>

        <label htmlFor={`${id}-phone`} className={STYLES.label}>
          {COPY.contactPhoneLabel}
        </label>
        <input
          id={`${id}-phone`}
          name={FIELDS.contactPhone}
          type="tel"
          minLength={8}
          maxLength={20}
          required
          className={STYLES.input}
        />

        <p className={STYLES.label}>{COPY.deliveryNotice}</p>

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
          className={STYLES.fileInput}
        />

        <button type="submit" className={STYLES.submit}>
          {sending ? COPY.sending : COPY.submit}
        </button>
      </fieldset>
      {result && !result.ok && (
        <div role="alert" className={STYLES.alertError}>
          <span>{result.message}</span>
        </div>
      )}
    </form>
  )
}
