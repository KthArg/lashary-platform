import type { SiteSection } from '../../../sections'

export interface SiteMenuProps {
  sections: readonly SiteSection[]
  anchorBase?: string
  onClose: () => void
}
