import { mensajesAdminProductos } from '../../constants/product-strings'
import { formularioProductoAdminStyles as STYLES } from '../ProductForm/ProductForm.styles'

export function FeedbackInvalido({ problems }: { problems?: string[] }) {
  return (
    <div role="alert" className={STYLES.alertError}>
      <div>
        <p className={STYLES.feedbackTitle}>{mensajesAdminProductos.form.validationTitle}</p>
        <ul className={STYLES.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
