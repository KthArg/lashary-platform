import type { ContactContent } from '@/features/content'

export interface SiteFooterProps {
  contact: Pick<ContactContent, 'contact' | 'hours'>
  year: number
}
