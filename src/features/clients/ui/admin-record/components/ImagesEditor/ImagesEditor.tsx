'use client'

import { useId, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { addRecordImageAction } from '../../actions/record-actions'
import { IMAGES_LABELS, RECORD_LABELS } from '../../constants/record-strings'
import { imagesEditorStyles as STYLES } from './ImagesEditor.styles'
import type { ImagesEditorProps } from './ImagesEditor.types'

export function ImagesEditor({ clientId, images, imageUrls }: ImagesEditorProps) {
  const router = useRouter()
  const fieldId = useId()
  const [error, setError] = useState<string | null>(null)
  const [isUploading, startUploading] = useTransition()

  const upload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    startUploading(async () => {
      const result = await addRecordImageAction(clientId, formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setError(null)
      form.reset()
      router.refresh()
    })
  }

  return (
    <div className={STYLES.editor}>
      {images.length === 0 ? (
        <p className={STYLES.muted}>{RECORD_LABELS.noImages}</p>
      ) : (
        <ul className={STYLES.grid}>
          {images.map((path, index) => (
            <li key={path} className={STYLES.item}>
              {imageUrls[path] ? (
                <img src={imageUrls[path]} alt={IMAGES_LABELS.imageAlt(index + 1)} className={STYLES.image} />
              ) : (
                <span className={STYLES.unavailable}>{IMAGES_LABELS.unavailable}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {error ? <p role="alert" className={STYLES.alert}>{error}</p> : null}
      <form onSubmit={upload} className={STYLES.form}>
        <label htmlFor={`${fieldId}-image`} className={STYLES.label}>{IMAGES_LABELS.field}</label>
        <input id={`${fieldId}-image`} name="image" type="file" accept={IMAGES_LABELS.accept} required
          disabled={isUploading} className={STYLES.input} />
        <button type="submit" disabled={isUploading} className={STYLES.button}>
          {isUploading ? IMAGES_LABELS.uploading : IMAGES_LABELS.upload}
        </button>
      </form>
    </div>
  )
}
