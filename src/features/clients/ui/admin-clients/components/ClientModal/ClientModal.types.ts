export interface ClientModalProps {
  isOpen: boolean
  title: string
  description: string
  isPaused?: boolean
  onRequestClose: () => void
  children: React.ReactNode
}
