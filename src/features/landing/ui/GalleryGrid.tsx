'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GalleryPair } from '@/features/content'
import { landingGalleryStyles as styles } from './LandingGallery.styles'
import { galleryFamilyLabels, landingMessages } from './messages'
import { useFocusTrap } from './use-focus-trap'

type GalleryGridProps = {
  pairs: readonly GalleryPair[]
}

const ALL = 'todas'

// Cuadrícula de pares con filtro por técnica y galería ampliada (criterio 3). Es el único trozo
// de cliente de la sección; los pares ya llegan resueltos y con consentimiento.
export function GalleryGrid({ pairs }: GalleryGridProps) {
  const copy = landingMessages.gallery
  const [filter, setFilter] = useState<string>(ALL)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Solo se ofrecen las técnicas que tienen algún par, en el orden en que aparecen.
  const families = [...new Set(pairs.map((pair) => pair.family))]
  const visible = filter === ALL ? pairs : pairs.filter((pair) => pair.family === filter)

  const close = useCallback(() => {
    // Quien abrió devuelve el foco (use-focus-trap): vuelve al par que se estaba mirando.
    if (openIndex !== null) tileRefs.current[openIndex]?.focus()
    setOpenIndex(null)
  }, [openIndex])

  const selectFilter = (next: string) => {
    setFilter(next)
    setOpenIndex(null)
  }

  return (
    <>
      {families.length > 1 && (
        <div role="group" aria-label={copy.filterLabel} className={styles.filters}>
          {[ALL, ...families].map((family) => (
            <button
              key={family}
              type="button"
              aria-pressed={filter === family}
              onClick={() => selectFilter(family)}
              className={`${styles.filter} ${filter === family ? styles.filterActive : ''}`}
            >
              {family === ALL ? copy.all : (galleryFamilyLabels[family] ?? family)}
            </button>
          ))}
        </div>
      )}

      <ul className={styles.grid}>
        {visible.map((pair, index) => (
          // El filtro rehace la lista: la clave incluye el filtro para que la entrada se anime.
          <li key={`${filter}-${pair.after.url}`} className={styles.tileIn}>
            <button
              ref={(node) => {
                tileRefs.current[index] = node
              }}
              type="button"
              onClick={() => setOpenIndex(index)}
              className={styles.tile}
            >
              <PairPhotos pair={pair} sizes="(max-width: 640px) 50vw, 15rem" />
            </button>
          </li>
        ))}
      </ul>

      <p className={styles.hint}>{copy.hint}</p>

      {openIndex !== null && visible[openIndex] && (
        <GalleryLightbox
          pairs={visible}
          index={openIndex}
          onNavigate={setOpenIndex}
          onClose={close}
        />
      )}
    </>
  )
}

type GalleryLightboxProps = {
  pairs: readonly GalleryPair[]
  index: number
  onNavigate: (index: number) => void
  onClose: () => void
}

// Galería ampliada como diálogo modal (UI-004): foco atrapado, Escape cierra, las flechas
// recorren los pares y el scroll de la página queda bloqueado mientras está abierta.
function GalleryLightbox({ pairs, index, onNavigate, onClose }: GalleryLightboxProps) {
  const copy = landingMessages.gallery
  const containerRef = useFocusTrap<HTMLDivElement>()
  const total = pairs.length
  const previous = () => onNavigate((index + total - 1) % total)
  const next = () => onNavigate((index + 1) % total)

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onNavigate((index + 1) % total)
      if (event.key === 'ArrowLeft') onNavigate((index + total - 1) % total)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [index, total, onNavigate, onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={copy.dialogLabel}
      className={styles.overlay}
    >
      {/* "Cerrar" va primero: es lo que enfoca la trampa de foco al abrir, como en el menú. */}
      <div className={styles.top}>
        <button type="button" onClick={onClose} className={styles.close}>
          {copy.close}
        </button>
      </div>

      <div className={styles.pair}>
        <PairPhotos pair={pairs[index]} sizes="(max-width: 896px) 50vw, 28rem" />
      </div>

      <div className={styles.controls}>
        <button type="button" onClick={previous} className={styles.control}>
          {copy.previous}
        </button>
        <p className={styles.counter} aria-live="polite">
          {index + 1} / {total}
        </p>
        <button type="button" onClick={next} className={styles.control}>
          {copy.next}
        </button>
      </div>
    </div>
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
