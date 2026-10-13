import type { SiteSection } from '../../../sections'

export interface SiteMenuProps {
  sections: readonly SiteSection[]
  onClose: () => void
}
