import { MAX_DECISION_REASON_LENGTH } from '../../../domain/appointment-decision.constants'
import {
  APPROVAL_QUEUE_ARIA,
  APPROVAL_QUEUE_LABELS,
  REASON_FIELD_ROWS,
} from '../constants/approval-queue.labels'
import { approvalQueueStyles as STYLES } from '../styles/approval-queue.styles'
import { formatAppointmentSlot } from '../utils/format-appointment-slot'
import type { ApprovalQueueItemProps } from '../types/approval-queue.types'

export function ApprovalQueueItem({ appointment, queue }: ApprovalQueueItemProps) {
  const slot = formatAppointmentSlot(appointment.startsAtMs, appointment.endsAtMs)
  const reasonFieldId = `approval-reason-${appointment.id}`
  const isBusy = queue.busyAppointmentId === appointment.id
  const isRejecting = queue.rejectingAppointmentId === appointment.id

  return (
    <li className={STYLES.item} aria-busy={isBusy}>
      <p className={STYLES.slot}>{slot}</p>
      {isRejecting ? (
        <div className={STYLES.rejectForm}>
          <label htmlFor={reasonFieldId} className={STYLES.reasonLabel}>
            {APPROVAL_QUEUE_LABELS.reasonLabel}
          </label>
          <textarea
            id={reasonFieldId}
            className={STYLES.reasonField}
            rows={REASON_FIELD_ROWS}
            maxLength={MAX_DECISION_REASON_LENGTH}
            value={queue.reason}
            onChange={(event) => queue.setReason(event.target.value)}
          />
          <div className={STYLES.actions}>
            <button type="button" className={STYLES.primaryButton} disabled={isBusy} onClick={() => queue.confirmReject(appointment.id)}>
              {isBusy ? APPROVAL_QUEUE_LABELS.saving : APPROVAL_QUEUE_LABELS.confirmReject}
            </button>
            <button type="button" className={STYLES.secondaryButton} disabled={isBusy} onClick={queue.cancelReject}>
              {APPROVAL_QUEUE_LABELS.cancelReject}
            </button>
          </div>
        </div>
      ) : (
        <div className={STYLES.actions}>
          <button type="button" className={STYLES.primaryButton} disabled={isBusy} aria-label={APPROVAL_QUEUE_ARIA.approve(slot)} onClick={() => queue.approve(appointment.id)}>
            {isBusy ? APPROVAL_QUEUE_LABELS.saving : APPROVAL_QUEUE_LABELS.approve}
          </button>
          <button type="button" className={STYLES.secondaryButton} disabled={isBusy} aria-label={APPROVAL_QUEUE_ARIA.reject(slot)} onClick={() => queue.startReject(appointment.id)}>
            {APPROVAL_QUEUE_LABELS.reject}
          </button>
        </div>
      )}
    </li>
  )
}
