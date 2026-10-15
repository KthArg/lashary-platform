import type { PendingAppointment } from '../../../application/ports'
import type { useApprovalQueue } from '../hooks/useApprovalQueue'

export interface ApprovalQueueProps {
  appointments: readonly PendingAppointment[]
  isLoading?: boolean
  loadError?: string | null
}

export interface ApprovalQueueItemProps {
  appointment: PendingAppointment
  queue: ReturnType<typeof useApprovalQueue>
}
