import type { ContactContent } from '@/features/content'

export interface SiteFooterProps {
  contact: Pick<ContactContent, 'contact' | 'hours'>
  year: number
  // La ruta del blog la compone la app: `landing` no conoce las rutas de `content`.
  blogHref?: string
}
