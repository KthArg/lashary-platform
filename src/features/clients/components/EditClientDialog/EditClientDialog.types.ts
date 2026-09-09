import type { ClientRecord } from '../../types/client.types'

export interface EditClientDialogProps {
  /** La clienta que se esta editando, o null cuando el dialogo esta cerrado. */
  client: ClientRecord | null
  /** Cierra el dialogo y devuelve el foco al lapiz que lo abrio (UI-004). */
  onClose: () => void
}
