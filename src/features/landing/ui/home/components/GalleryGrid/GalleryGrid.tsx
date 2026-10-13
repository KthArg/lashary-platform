'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GalleryPair } from '@/features/content'
import { landingGalleryStyles as STYLES } from '../LandingGallery/LandingGallery.styles'
import { galleryFamilyLabels, landingMessages } from '../../../constants/landing-strings'
import { useFocusTrap } from '../../../site-shell/hooks/use-focus-trap'
import type { GalleryGridProps } from './GalleryGrid.types'

const ALL = 'todas'

export function GalleryGrid({ pairs }: GalleryGridProps) {
  const copy = landingMessages.gallery
  const [filter, setFilter] = useState<string>(ALL)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([])

  const families = [...new Set(pairs.map((pair) => pair.family))]
  const visible = filter === ALL ? pairs : pairs.filter((pair) => pair.family === filter)

  const close = useCallback(() => {
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
        <div role="group" aria-label={copy.filterLabel} className={STYLES.filters}>
          {[ALL, ...families].map((family) => (
            <button
              key={family}
              type="button"
              aria-pressed={filter === family}
              onClick={() => selectFilter(family)}
              className={`${STYLES.filter} ${filter === family ? STYLES.filterActive : ''}`}
            >
              {family === ALL ? copy.all : (galleryFamilyLabels[family] ?? family)}
            </button>
          ))}
        </div>
      )}

      <ul className={STYLES.grid}>
        {visible.map((pair, index) => (
          <li key={`${filter}-${pair.after.url}`} className={STYLES.tileIn}>
            <button
              ref={(node) => {
                tileRefs.current[index] = node
              }}
              type="button"
              onClick={() => setOpenIndex(index)}
              className={STYLES.tile}
            >
              <PairPhotos pair={pair} sizes="(max-width: 640px) 50vw, 15rem" />
            </button>
          </li>
        ))}
      </ul>

      <p className={STYLES.hint}>{copy.hint}</p>

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
      className={STYLES.overlay}
    >
      <div className={STYLES.top}>
        <button type="button" onClick={onClose} className={STYLES.close}>
          {copy.close}
        </button>
      </div>

      <div className={STYLES.pair}>
        <PairPhotos pair={pairs[index]} sizes="(max-width: 896px) 50vw, 28rem" />
      </div>

      <div className={STYLES.controls}>
        <button type="button" onClick={previous} className={STYLES.control}>
          {copy.previous}
        </button>
        <p className={STYLES.counter} aria-live="polite">
          {index + 1} / {total}
        </p>
        <button type="button" onClick={next} className={STYLES.control}>
          {copy.next}
        </button>
      </div>
    </div>
  )
}

function PairPhotos({ pair, sizes }: { pair: GalleryPair; sizes: string }) {
  const copy = landingMessages.gallery

  return (
    <>
      {[
        { photo: pair.before, label: copy.before },
        { photo: pair.after, label: copy.after },
      ].map(({ photo, label }) => (
        <span key={label} className={STYLES.half}>
          <Image src={photo.url} alt={photo.alt} fill sizes={sizes} className={STYLES.photo} />
          <span className={STYLES.label}>{label}</span>
        </span>
      ))}
    </>
  )
}
