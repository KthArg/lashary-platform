import { formularioProductoAdminStyles as STYLES } from './FormularioProductoAdmin.styles'

export function FeedbackOk({ message }: { message?: string }) {
  return (
    <div role="status" className={STYLES.alertSuccess}>
      <span>{message}</span>
    </div>
  )
}
