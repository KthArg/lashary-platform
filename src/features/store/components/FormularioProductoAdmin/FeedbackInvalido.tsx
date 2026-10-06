import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { formularioProductoAdminStyles as STYLES } from './FormularioProductoAdmin.styles'

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
