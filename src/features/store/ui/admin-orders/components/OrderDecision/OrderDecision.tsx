'use client'

import { useActionState, useId } from 'react'
import { MIN_REJECTION_REASON_LENGTH, MAX_REJECTION_REASON_LENGTH } from '@/features/store/domain/order'
import { approveOrderAction, rejectOrderAction } from '../../actions/order-review-actions'
import { ORDER_REVIEW_FIELDS as FIELDS, orderDecisionMessages as copy } from '../../constants/order-queue-strings'
import type { OrderReviewActionResult } from '../../types/order-review-results'
import { useQueueFeedback } from '../QueueFeedback'
import { orderDecisionStyles as STYLES } from './OrderDecision.styles'
import type { OrderDecisionProps } from './OrderDecision.types'

export function OrderDecision({ orderId }: OrderDecisionProps) {
  const id = useId()
  const announce = useQueueFeedback()
  const withFeedback =
    (action: (previous: OrderReviewActionResult | null, formData: FormData) => Promise<OrderReviewActionResult>) =>
    async (previous: OrderReviewActionResult | null, formData: FormData) => {
      const result = await action(previous, formData)
      if (result.ok) announce(result.message)
      return result
    }
  const [approved, approve, approving] = useActionState(withFeedback(approveOrderAction), null)
  const [rejected, reject, rejecting] = useActionState(withFeedback(rejectOrderAction), null)
  const busy = approving || rejecting
  const failure = [approved, rejected].find((result) => result && !result.ok)

  return (
    <div className={STYLES.box}>
      <form action={approve}>
        <input type="hidden" name={FIELDS.orderId} value={orderId} />
        <button type="submit" disabled={busy} className={STYLES.approve}>
          {approving ? copy.approving : copy.approve}
        </button>
      </form>

      <form action={reject} className={STYLES.form}>
        <fieldset className={STYLES.form} disabled={busy}>
          <legend className={STYLES.legend}>{copy.rejectLegend}</legend>
          <input type="hidden" name={FIELDS.orderId} value={orderId} />
          <label htmlFor={`${id}-reason`} className={STYLES.label}>
            {copy.reasonLabel}
          </label>
          <textarea
            id={`${id}-reason`}
            name={FIELDS.reason}
            required
            minLength={MIN_REJECTION_REASON_LENGTH}
            maxLength={MAX_REJECTION_REASON_LENGTH}
            rows={2}
            className={STYLES.textarea}
          />
          <button type="submit" className={STYLES.reject}>
            {rejecting ? copy.rejecting : copy.reject}
          </button>
        </fieldset>
      </form>

      {failure && (
        <div role="alert" className={STYLES.alertError}>
          <span>{failure.message}</span>
        </div>
      )}
    </div>
  )
}
