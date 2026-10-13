import { GalleryGrid } from '../GalleryGrid'
import { landingGalleryStyles as STYLES } from './LandingGallery.styles'
import { landingMessages } from '../../../constants/landing-strings'
import { GALLERY_SECTION } from '../../../sections'
import type { LandingGalleryProps } from './LandingGallery.types'

export function LandingGallery({ pairs }: LandingGalleryProps) {
  const copy = landingMessages.gallery

  return (
    <section id={GALLERY_SECTION.id} className={STYLES.section}>
      <div className={STYLES.inner}>
        <div className={STYLES.heading}>
          <h2 className={STYLES.title}>{copy.title}</h2>
          <span aria-hidden="true" className={STYLES.rule} />
          <span aria-hidden="true" className={STYLES.index}>
            {copy.index}
          </span>
        </div>

        {pairs.length === 0 ? (
          <p className={STYLES.empty}>{copy.empty}</p>
        ) : (
          <GalleryGrid pairs={pairs} />
        )}
      </div>
    </section>
  )
}
