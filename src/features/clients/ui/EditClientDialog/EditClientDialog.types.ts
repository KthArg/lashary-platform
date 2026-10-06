import type { ClientRecord } from '../../domain/client.types'

export interface EditClientDialogProps {
  client: ClientRecord | null
  onClose: () => void
}
