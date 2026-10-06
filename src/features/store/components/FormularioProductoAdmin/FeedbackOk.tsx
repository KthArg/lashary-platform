import { formularioProductoAdminStyles as s } from './FormularioProductoAdmin.styles'

export function FeedbackOk({ message }: { message?: string }) {
  return (
    <div role="status" className={s.alertSuccess}>
      <span>{message}</span>
    </div>
  )
}
