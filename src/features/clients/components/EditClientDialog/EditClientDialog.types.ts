import type { ClientRecord } from '../../types/client.types'

export interface EditClientDialogProps {
  client: ClientRecord | null
  onClose: () => void
}
