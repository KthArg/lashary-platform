import { formularioProductoAdminStyles as STYLES } from '../ProductForm/ProductForm.styles'

export function FeedbackOk({ message }: { message?: string }) {
  return (
    <div role="status" className={STYLES.alertSuccess}>
      <span>{message}</span>
    </div>
  )
}
