export interface ClientModalProps {
  isOpen: boolean
  title: string
  description: string
  /** Cede la trampa de foco mientras un dialogo se monta encima (UI-004). */
  isPaused?: boolean
  onRequestClose: () => void
  children: React.ReactNode
}
