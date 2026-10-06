import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { tablaProductosAdminStyles as STYLES } from './TablaProductosAdmin.styles'
import type { TablaProductosAdminProps } from './TablaProductosAdmin.types'

const textosPanel = mensajesAdminProductos.admin

export function TablaProductosAdmin({ filas }: TablaProductosAdminProps) {
  return (
    <div className={STYLES.wrapper}>
      <table className={STYLES.table}>
        <thead>
          <tr>
            <th>{textosPanel.columns.nombre}</th>
            <th>{textosPanel.columns.slug}</th>
            <th>{textosPanel.columns.precio}</th>
            <th>{textosPanel.columns.orden}</th>
            <th>{textosPanel.columns.status}</th>
            <th>
              <span className={STYLES.srOnly}>{textosPanel.columns.actions}</span>
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
                  {textosPanel.rowActions.edit}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
