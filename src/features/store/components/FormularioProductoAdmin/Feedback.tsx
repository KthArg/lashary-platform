import type { ComponentType } from 'react'
import type { EstadoAccionProducto } from '../../actions/estado-accion-producto'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { formularioProductoAdminStyles as s } from './FormularioProductoAdmin.styles'

function FeedbackIdle() {
  return null
}

function FeedbackOk({ message }: { message?: string }) {
  return (
    <div role="status" className={s.alertSuccess}>
      <span>{message}</span>
    </div>
  )
}

function FeedbackForbidden({ message }: { message?: string }) {
  return (
    <div role="alert" className={s.alertWarning}>
      <span>{message}</span>
    </div>
  )
}

function FeedbackInvalido({ problems }: { problems?: string[] }) {
  return (
    <div role="alert" className={s.alertError}>
      <div>
        <p className={s.feedbackTitle}>{mensajesAdminProductos.form.validationTitle}</p>
        <ul className={s.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const FEEDBACKS: Record<EstadoAccionProducto['status'], ComponentType<any>> = {
  idle: FeedbackIdle,
  ok: FeedbackOk,
  forbidden: FeedbackForbidden,
  invalid: FeedbackInvalido,
}

export function Feedback(estado: EstadoAccionProducto) {
  const Componente = FEEDBACKS[estado.status]
  return <Componente message={estado.message} problems={estado.problems} />
}
