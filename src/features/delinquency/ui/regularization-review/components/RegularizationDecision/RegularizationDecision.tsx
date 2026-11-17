'use client'

import { useActionState, useId } from 'react'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { REJECTION_REASON_MAX_LENGTH } from '@/features/delinquency/domain/regularization'
import { approveRegularizationAction, rejectRegularizationAction } from '../../actions/review-actions'
import { decisionMessages as copy, REVIEW_FIELDS as FIELDS } from '../../constants/queue-strings'
import type { ReviewActionResult } from '@/features/delinquency/ui/regularization-review/types/review-results'
import { useQueueFeedback } from '../QueueFeedback'
import { regularizationDecisionStyles as STYLES } from './RegularizationDecision.styles'
import type { RegularizationDecisionProps } from './RegularizationDecision.types'

const amount = (colones: number): string => formatMoney(moneyFromColones(colones))

// El monto aprobado empieza vacío a propósito: la administradora escribe lo que ve en el comprobante, no lo que
// declara la clienta (pedido del PO, Kenny, 2026-11-13).
export function RegularizationDecision({ requestId, declaredAmount, pendingToday }: RegularizationDecisionProps) {
  const id = useId()
  const announce = useQueueFeedback()
  // Un resultado bueno saca la solicitud de la cola y esta tarjeta desaparece al recargar: se anuncia arriba de la
  // cola, que sigue montada. Un error deja la tarjeta y se muestra en ella.
  const withFeedback =
    (action: (previous: ReviewActionResult | null, formData: FormData) => Promise<ReviewActionResult>) =>
    async (previous: ReviewActionResult | null, formData: FormData) => {
      const result = await action(previous, formData)
      if (result.ok) announce(result.message)
      return result
    }
  const [approved, approve, approving] = useActionState(withFeedback(approveRegularizationAction), null)
  const [rejected, reject, rejecting] = useActionState(withFeedback(rejectRegularizationAction), null)
  const busy = approving || rejecting
  const failure = [approved, rejected].find((result) => result && !result.ok)

  return (
    <div className={STYLES.box}>
      <form action={approve} className={STYLES.form}>
        <fieldset className={STYLES.form} disabled={busy}>
          <legend className={STYLES.legend}>{copy.approveLegend}</legend>
          <input type="hidden" name={FIELDS.requestId} value={requestId} />
          <label htmlFor={`${id}-amount`} className={STYLES.label}>
            {copy.amountLabel}
          </label>
          <input
            id={`${id}-amount`}
            name={FIELDS.approvedAmount}
            type="number"
            inputMode="numeric"
            min={1}
            max={pendingToday}
            step={1}
            required
            aria-describedby={`${id}-amount-hint`}
            className={STYLES.input}
          />
          <p id={`${id}-amount-hint`} className={STYLES.hint}>
            {copy.amountHint(amount(declaredAmount), amount(pendingToday))}
          </p>
          <button type="submit" className={STYLES.approve}>
            {approving ? copy.approving : copy.approve}
          </button>
        </fieldset>
      </form>

      <form action={reject} className={STYLES.form}>
        <fieldset className={STYLES.form} disabled={busy}>
          <legend className={STYLES.legend}>{copy.rejectLegend}</legend>
          <input type="hidden" name={FIELDS.requestId} value={requestId} />
          <label htmlFor={`${id}-reason`} className={STYLES.label}>
            {copy.reasonLabel}
          </label>
          <textarea
            id={`${id}-reason`}
            name={FIELDS.reason}
            required
            maxLength={REJECTION_REASON_MAX_LENGTH}
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
