import type { GalleryPair } from '@/features/content'
import { GalleryGrid } from './GalleryGrid'
import { landingGalleryStyles as styles } from './LandingGallery.styles'
import { landingMessages } from './messages'
import { GALLERY_SECTION } from './sections'

type LandingGalleryProps = {
  pairs: readonly GalleryPair[]
}

// Sección "Galería" (US-LAND-03): pares antes y después que la dueña publica en el CMS. Llegan
// ya filtrados por consentimiento desde `content`. La sección se renderiza siempre —el ancla de
// la navegación tiene que existir— y sin pares muestra su estado vacío (UI-003).
export function LandingGallery({ pairs }: LandingGalleryProps) {
  const copy = landingMessages.gallery

  return (
    <section id={GALLERY_SECTION.id} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{copy.title}</h2>
          <span aria-hidden="true" className={styles.rule} />
          <span aria-hidden="true" className={styles.index}>
            {copy.index}
          </span>
        </div>

        {pairs.length === 0 ? (
          <p className={styles.empty}>{copy.empty}</p>
        ) : (
          <GalleryGrid pairs={pairs} />
        )}
      </div>
    </section>
  )
}
