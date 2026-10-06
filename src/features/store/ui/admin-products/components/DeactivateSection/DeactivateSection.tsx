import type { EstadoAccionProducto } from '../../types/product-action-state'
import { mensajesAdminProductos } from '../../constants/product-strings'
import { Feedback } from '../ProductFormFeedback/ProductFormFeedback'
import { formularioProductoAdminStyles as STYLES } from '../ProductForm/ProductForm.styles'

type Props = {
  productId: string
  deactivateAction: (formData: FormData) => void
  deactivateState: EstadoAccionProducto
  deactivating: boolean
}

export function SeccionDesactivar({
  productId,
  deactivateAction,
  deactivateState,
  deactivating,
}: Props) {
  return (
    <form action={deactivateAction} className={STYLES.deactivateForm}>
      <input type="hidden" name="id" value={productId} />
      <Feedback {...deactivateState} />
      <button type="submit" className={STYLES.deactivateButton} disabled={deactivating}>
        {mensajesAdminProductos.admin.rowActions.deactivate}
      </button>
    </form>
  )
}
