import type { EstadoAccionProducto } from '../../actions/estado-accion-producto'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { CAMPOS_PRODUCTO } from '../../constants/campos-producto-admin'
import { Feedback } from './Feedback'
import { formularioProductoAdminStyles as s } from './FormularioProductoAdmin.styles'

export type SeccionDesactivarProps = {
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
}: SeccionDesactivarProps) {
  return (
    <form action={deactivateAction} className={s.deactivateForm}>
      <input type="hidden" name={CAMPOS_PRODUCTO.id} value={productoId} />
      <Feedback {...deactivateState} />
      <button type="submit" className={s.deactivateButton} disabled={deactivating}>
        {mensajesAdminProductos.form.deactivateAction}
      </button>
    </form>
  )
}
