'use client'

import { useEffect } from 'react'
import { useFocusTrap } from '../../../admin-clients/hooks/useFocusTrap'
import { IMAGES_LABELS } from '../../constants/record-strings'
import { RecordIcon } from '../RecordIcon'
import { imageViewerStyles as STYLES } from './ImageViewer.styles'
import type { ImageViewerProps } from './ImageViewer.types'

export function ImageViewer({ url, alt, onClose, onPrevious, onNext }: ImageViewerProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onPrevious?.()
      if (event.key === 'ArrowRight') onNext?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onPrevious, onNext])

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={alt} tabIndex={-1}
      className={STYLES.backdrop} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <img src={url} alt={alt} className={STYLES.image} />
      <button type="button" onClick={onClose} aria-label={IMAGES_LABELS.close} className={STYLES.close}>
        <RecordIcon name="close" className={STYLES.icon} />
      </button>
      {onPrevious ? (
        <button type="button" onClick={onPrevious} aria-label={IMAGES_LABELS.previous} className={STYLES.previous}>
          <RecordIcon name="previous" className={STYLES.icon} />
        </button>
      ) : null}
      {onNext ? (
        <button type="button" onClick={onNext} aria-label={IMAGES_LABELS.next} className={STYLES.next}>
          <RecordIcon name="next" className={STYLES.icon} />
        </button>
      ) : null}
    </div>
  )
}
