import type { EstadoAccionProducto } from '../../actions/estado-accion-producto'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { Feedback } from './Feedback'
import { formularioProductoAdminStyles as STYLES } from './FormularioProductoAdmin.styles'

type Props = {
  productoId: string
  deactivateAction: (formData: FormData) => void
  deactivateState: EstadoAccionProducto
  deactivating: boolean
}

export function SeccionDesactivar({
  productoId,
  deactivateAction,
  deactivateState,
  deactivating,
}: Props) {
  return (
    <form action={deactivateAction} className={STYLES.deactivateForm}>
      <input type="hidden" name="id" value={productoId} />
      <Feedback {...deactivateState} />
      <button type="submit" className={STYLES.deactivateButton} disabled={deactivating}>
        {mensajesAdminProductos.admin.rowActions.deactivate}
      </button>
    </form>
  )
}
