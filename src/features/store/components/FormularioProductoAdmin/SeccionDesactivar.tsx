import type { EstadoAccionProducto } from '../../actions/estado-accion-producto'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { Feedback } from './Feedback'
import { formularioProductoAdminStyles as s } from './FormularioProductoAdmin.styles'

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
    <form action={deactivateAction} className={s.deactivateForm}>
      <input type="hidden" name="id" value={productoId} />
      <Feedback {...deactivateState} />
      <button type="submit" className={s.deactivateButton} disabled={deactivating}>
        {mensajesAdminProductos.admin.rowActions.deactivate}
      </button>
    </form>
  )
}

export function SinSeccionDesactivar() {
  return null
}
