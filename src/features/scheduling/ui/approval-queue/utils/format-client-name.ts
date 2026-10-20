import { APPROVAL_QUEUE_CLIENT } from '../constants/approval-queue.labels'

export function formatClientName(clientName: string | null): string {
  return clientName ?? APPROVAL_QUEUE_CLIENT.noClient
}
