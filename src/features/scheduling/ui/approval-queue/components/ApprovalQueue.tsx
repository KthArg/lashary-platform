'use client'

import { APPROVAL_QUEUE_ARIA, APPROVAL_QUEUE_LABELS } from '../constants/approval-queue.labels'
import { useApprovalQueue } from '../hooks/useApprovalQueue'
import { approvalQueueStyles as STYLES } from '../styles/approval-queue.styles'
import { ApprovalQueueItem } from './ApprovalQueueItem'
import type { ApprovalQueueProps } from '../types/approval-queue.types'

export function ApprovalQueue({ appointments, isLoading = false, loadError = null }: ApprovalQueueProps) {
  const queue = useApprovalQueue()

  const renderBody = () => {
    if (isLoading) {
      return <p role="status" className={STYLES.message}>{APPROVAL_QUEUE_LABELS.loading}</p>
    }
    if (loadError) {
      return (
        <div role="alert" className={STYLES.error}>
          <p>{loadError}</p>
          <button type="button" className={STYLES.secondaryButton} onClick={queue.retry}>
            {APPROVAL_QUEUE_LABELS.retry}
          </button>
        </div>
      )
    }
    if (appointments.length === 0) {
      return <p className={STYLES.message}>{APPROVAL_QUEUE_LABELS.empty}</p>
    }
    return (
      <ul className={STYLES.list} aria-label={APPROVAL_QUEUE_ARIA.list}>
        {appointments.map((appointment) => (
          <ApprovalQueueItem key={appointment.id} appointment={appointment} queue={queue} />
        ))}
      </ul>
    )
  }

  return (
    <section className={STYLES.section}>
      <h2 className={STYLES.title}>{APPROVAL_QUEUE_LABELS.listTitle}</h2>
      {queue.errorMessage ? <p role="alert" className={STYLES.decisionError}>{queue.errorMessage}</p> : null}
      {renderBody()}
    </section>
  )
}
