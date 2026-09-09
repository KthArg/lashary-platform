import type { HomeContent } from '@/features/content'
import { SiteShell } from './SiteShell'
import { Hero } from './Hero'

/** Página de inicio del sitio público (US-LAND-01). La compone la ruta `src/app/page.tsx`. */
export function HomePage({ content }: { content: HomeContent }) {
  return (
    <SiteShell>
      <Hero content={content} />
    </SiteShell>
  )
}
