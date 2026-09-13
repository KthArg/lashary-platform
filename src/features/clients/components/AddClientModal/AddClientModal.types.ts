export interface AddClientModalProps {
  isOpen: boolean
  /** Cede la trampa de foco mientras un dialogo se monta encima (UI-004). */
  isPaused?: boolean
  onRequestClose: () => void
  children: React.ReactNode
}
