import { formularioProductoAdminStyles as s } from './FormularioProductoAdmin.styles'

export function FeedbackForbidden({ message }: { message?: string }) {
  return (
    <div role="alert" className={s.alertWarning}>
      <span>{message}</span>
    </div>
  )
}
