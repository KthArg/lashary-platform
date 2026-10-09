import { productStrings } from '../../constants/product-strings'
import { productFormStyles as STYLES } from '../ProductForm/ProductForm.styles'
import type { ProductImageFieldProps } from './ProductImageField.types'

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp'

export function ProductImageField({ required, previewUrl, hidePreview }: ProductImageFieldProps) {
  return (
    <div className={STYLES.imageField}>
      <figure className={STYLES.imagePreview} hidden={hidePreview}>
        <img src={previewUrl} alt="" className={STYLES.imagePreviewThumb} />
        <figcaption className={STYLES.imagePreviewCaption}>
          {productStrings.form.fields.currentImage}
        </figcaption>
      </figure>
      <label className={STYLES.fieldLabel} htmlFor="image">
        <span className={STYLES.labelText}>{productStrings.form.fields.image}</span>
        <input
          id="image"
          name="image"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          required={required}
          className={STYLES.fileInput}
        />
      </label>
    </div>
  )
}
