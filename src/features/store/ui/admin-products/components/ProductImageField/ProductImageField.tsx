'use client'

import { productStrings } from '../../constants/product-strings'
import { useChosenImagePreview } from '../../hooks/useChosenImagePreview'
import { productFormStyles as STYLES } from '../ProductForm/ProductForm.styles'
import type { ProductImageFieldProps } from './ProductImageField.types'

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'
const PLUS_ICON_PATH = 'M12 5v14 M5 12h14'

const fieldMessages = productStrings.form.fields

export function ProductImageField({ required, previewUrl, hidePreview }: ProductImageFieldProps) {
  const { inputRef, chosenUrl, chooseImage } = useChosenImagePreview()
  const emptyTileLabel = hidePreview ? fieldMessages.addImage : fieldMessages.changeImage

  return (
    <div className={STYLES.imageField}>
      <span className={STYLES.labelText}>{fieldMessages.image}</span>
      <div className={STYLES.imageTiles}>
        {hidePreview ? null : (
          <figure className={STYLES.imageCurrent}>
            <div className={STYLES.imageTile}>
              <img src={previewUrl} alt="" className={STYLES.imageThumb} />
            </div>
            <figcaption className={STYLES.imageCaption}>{fieldMessages.currentImage}</figcaption>
          </figure>
        )}
        <div className={STYLES.imageTile}>
          <input
            ref={inputRef}
            id="image"
            name="image"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            required={required}
            onChange={chooseImage}
            className={STYLES.fileInput}
          />
          <label htmlFor="image" className={chosenUrl ? STYLES.chosenTile : STYLES.addTile}>
            {chosenUrl ? (
              <>
                <img src={chosenUrl} alt={fieldMessages.chosenImageAlt} className={STYLES.imageThumb} />
                <span className={STYLES.changeBar}>{fieldMessages.changeImage}</span>
              </>
            ) : (
              <>
                <svg
                  className={STYLES.addIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d={PLUS_ICON_PATH} />
                </svg>
                <span>{emptyTileLabel}</span>
                <span className={STYLES.addHint}>{fieldMessages.imageHint}</span>
              </>
            )}
          </label>
        </div>
      </div>
    </div>
  )
}
