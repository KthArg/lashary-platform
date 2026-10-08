import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { tablaProductosAdminStyles as STYLES } from './TablaProductosAdmin.styles'
import type { TablaProductosAdminProps } from './TablaProductosAdmin.types'

const m = mensajesAdminProductos.admin

export function TablaProductosAdmin({ filas }: TablaProductosAdminProps) {
  return (
    <div className={STYLES.wrapper}>
      <table className={STYLES.table}>
        <thead>
          <tr>
            <th>{m.columns.nombre}</th>
            <th>{m.columns.slug}</th>
            <th>{m.columns.precio}</th>
            <th>{m.columns.orden}</th>
            <th>{m.columns.status}</th>
            <th>
              <span className={STYLES.srOnly}>{m.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id}>
              <td className={STYLES.nameCell}>{fila.nombre}</td>
              <td>{fila.slug}</td>
              <td>{fila.precioFormateado}</td>
              <td>{fila.orden}</td>
              <td>
                <span className={fila.estadoClase}>{fila.estadoTexto}</span>
              </td>
              <td className={STYLES.actionsCell}>
                <Link href={fila.hrefEditar} className={STYLES.editLink}>
                  {m.rowActions.edit}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
