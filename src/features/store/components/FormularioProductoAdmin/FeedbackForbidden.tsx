import { formularioProductoAdminStyles as STYLES } from './FormularioProductoAdmin.styles'

export function FeedbackForbidden({ message }: { message?: string }) {
  return (
    <div role="alert" className={STYLES.alertWarning}>
      <span>{message}</span>
    </div>
  )
}
