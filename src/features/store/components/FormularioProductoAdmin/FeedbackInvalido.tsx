import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { formularioProductoAdminStyles as s } from './FormularioProductoAdmin.styles'

export function FeedbackInvalido({ problems }: { problems: string[] }) {
  return (
    <div role="alert" className={s.alertError}>
      <div>
        <p className={s.feedbackTitle}>{mensajesAdminProductos.form.validationTitle}</p>
        <ul className={s.feedbackList}>
          {problems.map((problem, index) => (
            <li key={`${index}-${problem}`}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
