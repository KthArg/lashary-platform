import type { InactiveClient } from '@/features/notifications/domain/inactive-reminder'

export type InactiveClientsTableProps = {
  clients: InactiveClient[]
  selection?: { pending: boolean }
}
