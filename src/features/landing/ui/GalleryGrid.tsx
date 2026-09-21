'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { GalleryPair } from '@/features/content'
import { landingGalleryStyles as styles } from './LandingGallery.styles'
import { galleryFamilyLabels, landingMessages } from './messages'

type GalleryGridProps = {
  pairs: readonly GalleryPair[]
}

const ALL = 'todas'

// Cuadrícula de pares con filtro por técnica (criterio 3). Es el único trozo de cliente de la
// sección; los pares ya llegan resueltos y con consentimiento.
export function GalleryGrid({ pairs }: GalleryGridProps) {
  const copy = landingMessages.gallery
  const [filter, setFilter] = useState<string>(ALL)

  // Solo se ofrecen las técnicas que tienen algún par, en el orden en que aparecen.
  const families = [...new Set(pairs.map((pair) => pair.family))]
  const visible = filter === ALL ? pairs : pairs.filter((pair) => pair.family === filter)

  return (
    <>
      {families.length > 1 && (
        <div role="group" aria-label={copy.filterLabel} className={styles.filters}>
          {[ALL, ...families].map((family) => (
            <button
              key={family}
              type="button"
              aria-pressed={filter === family}
              onClick={() => setFilter(family)}
              className={`${styles.filter} ${filter === family ? styles.filterActive : ''}`}
            >
              {family === ALL ? copy.all : (galleryFamilyLabels[family] ?? family)}
            </button>
          ))}
        </div>
      )}

      <ul className={styles.grid}>
        {visible.map((pair) => (
          // El filtro rehace la lista: la clave incluye el filtro para que la entrada se anime.
          <li key={`${filter}-${pair.after.url}`} className={`${styles.tile} ${styles.tileIn}`}>
            <PairPhotos pair={pair} sizes="(max-width: 640px) 50vw, 15rem" />
          </li>
        ))}
      </ul>
    </>
  )
}

// Las dos fotos de un par, con su etiqueta. El `alt` de cada foto lo escribió la dueña en el CMS.
function PairPhotos({ pair, sizes }: { pair: GalleryPair; sizes: string }) {
  const copy = landingMessages.gallery

  return (
    <>
      {[
        { photo: pair.before, label: copy.before },
        { photo: pair.after, label: copy.after },
      ].map(({ photo, label }) => (
        <span key={label} className={styles.half}>
          <Image src={photo.url} alt={photo.alt} fill sizes={sizes} className={styles.photo} />
          <span className={styles.label}>{label}</span>
        </span>
      ))}
    </>
  )
}
