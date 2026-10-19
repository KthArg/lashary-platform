'use client'

import { useCallback, useId, useRef, useState, useTransition, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { isErr } from '@/shared/result'
import { recordImageExtension } from '@/features/clients/domain/record/record-image'
import { RECORD_LIMITS } from '@/features/clients/domain/record/record-limits'
import { addRecordImageAction } from '../../actions/record-actions'
import { IMAGES_LABELS, RECORD_IMAGE_PROBLEM_MESSAGES, RECORD_LABELS } from '../../constants/record-strings'
import { RecordIcon } from '../RecordIcon'
import { ImageViewer } from '../ImageViewer'
import { imagesEditorStyles as STYLES } from './ImagesEditor.styles'
import type { ImagesEditorProps } from './ImagesEditor.types'

export function ImagesEditor({ clientId, images, imageUrls }: ImagesEditorProps) {
  const router = useRouter()
  const fieldId = useId()
  const [error, setError] = useState<string | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [expiredPaths, setExpiredPaths] = useState<readonly string[]>([])
  const [isUploading, startUploading] = useTransition()
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const isFull = images.length >= RECORD_LIMITS.maxImages
  const viewable = images.filter((path) => imageUrls[path] && !expiredPaths.includes(path))
  const openPath = openIndex === null ? null : viewable[openIndex]

  const closeViewer = useCallback(() => {
    setOpenIndex(null)
    triggerRef.current?.focus()
  }, [])

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    const checked = recordImageExtension(file.type, file.size)
    if (isErr(checked)) {
      setError(RECORD_IMAGE_PROBLEM_MESSAGES[checked.error])
      input.value = ''
      return
    }
    const formData = new FormData()
    formData.append('image', file)
    startUploading(async () => {
      const result = await addRecordImageAction(clientId, formData)
      input.value = ''
      if (!result.ok) {
        setError(result.error)
        if (result.saved) router.refresh()
        return
      }
      setError(null)
      router.refresh()
    })
  }

  return (
    <div className={STYLES.editor}>
      {images.length === 0 ? <p className={STYLES.muted}>{RECORD_LABELS.noImages}</p> : null}
      <ul className={STYLES.grid}>
        {images.map((path, index) => (
          <li key={path} className={STYLES.tile}>
            {expiredPaths.includes(path) ? (
              <span className={STYLES.unavailable}>{IMAGES_LABELS.expired}</span>
            ) : imageUrls[path] ? (
              <button type="button" className={STYLES.tileButton} aria-label={IMAGES_LABELS.open(index + 1)}
                onClick={(event) => { triggerRef.current = event.currentTarget; setOpenIndex(viewable.indexOf(path)) }}>
                <img src={imageUrls[path]} alt={IMAGES_LABELS.imageAlt(index + 1)} className={STYLES.image}
                  onError={() => setExpiredPaths((paths) => [...paths, path])} />
              </button>
            ) : (
              <span className={STYLES.unavailable}>{IMAGES_LABELS.unavailable}</span>
            )}
          </li>
        ))}
        {isFull ? null : (
          <li className={STYLES.tile}>
            <label htmlFor={`${fieldId}-image`} className={isUploading ? STYLES.addTileBusy : STYLES.addTile}>
              <RecordIcon name="plus" className={STYLES.addIcon} />
              <span>{isUploading ? IMAGES_LABELS.uploading : IMAGES_LABELS.addPhoto}</span>
              <span className={STYLES.hint}>{IMAGES_LABELS.addPhotoHint}</span>
            </label>
            <input id={`${fieldId}-image`} type="file" accept={IMAGES_LABELS.accept} onChange={upload}
              disabled={isUploading} className={STYLES.fileInput} />
          </li>
        )}
      </ul>
      {isFull ? <p className={STYLES.muted}>{IMAGES_LABELS.limitReached}</p> : null}
      {error ? <p role="alert" className={STYLES.alert}>{error}</p> : null}
      {openIndex !== null && openPath ? (
        <ImageViewer
          url={imageUrls[openPath]}
          alt={IMAGES_LABELS.imageAlt(images.indexOf(openPath) + 1)}
          onClose={closeViewer}
          onPrevious={openIndex > 0 ? () => setOpenIndex(openIndex - 1) : undefined}
          onNext={openIndex < viewable.length - 1 ? () => setOpenIndex(openIndex + 1) : undefined}
        />
      ) : null}
    </div>
  )
}
