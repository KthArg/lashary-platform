export interface ClientModalProps {
  isOpen: boolean
  /** Encabezado del dialogo: "Nueva clienta" o "Editar clienta". Lo aporta quien lo abre (DOM-009). */
  title: string
  description: string
  /** Cede la trampa de foco mientras un dialogo se monta encima (UI-004). */
  isPaused?: boolean
  onRequestClose: () => void
  children: React.ReactNode
}
