import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { tablaProductosAdminStyles as s } from './TablaProductosAdmin.styles'
import type { TablaProductosAdminProps } from './TablaProductosAdmin.types'

const m = mensajesAdminProductos.admin

export function TablaProductosAdmin({ filas }: TablaProductosAdminProps) {
  return (
    <div className={s.wrapper}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>{m.columns.nombre}</th>
            <th>{m.columns.slug}</th>
            <th>{m.columns.precio}</th>
            <th>{m.columns.orden}</th>
            <th>{m.columns.status}</th>
            <th>
              <span className={s.srOnly}>{m.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id}>
              <td className={s.nameCell}>{fila.nombre}</td>
              <td>{fila.slug}</td>
              <td>{fila.precioFormateado}</td>
              <td>{fila.orden}</td>
              <td>
                <span className={fila.estadoClase}>{fila.estadoTexto}</span>
              </td>
              <td className={s.actionsCell}>
                <Link href={fila.hrefEditar} className={s.editLink}>
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
