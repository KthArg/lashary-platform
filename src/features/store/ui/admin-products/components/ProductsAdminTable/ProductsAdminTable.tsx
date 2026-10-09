import Link from 'next/link'
import { productStrings } from '../../constants/product-strings'
import { productsAdminTableStyles as STYLES } from './ProductsAdminTable.styles'
import type { ProductsAdminTableProps } from './ProductsAdminTable.types'

const adminMessages = productStrings.admin

export function ProductsAdminTable({ rows }: ProductsAdminTableProps) {
  return (
    <div className={STYLES.wrapper}>
      <table className={STYLES.table}>
        <thead>
          <tr>
            <th>{adminMessages.columns.name}</th>
            <th>{adminMessages.columns.slug}</th>
            <th>{adminMessages.columns.price}</th>
            <th>{adminMessages.columns.order}</th>
            <th>{adminMessages.columns.status}</th>
            <th>
              <span className={STYLES.srOnly}>{adminMessages.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={STYLES.nameCell}>{row.name}</td>
              <td>{row.slug}</td>
              <td>{row.formattedPrice}</td>
              <td>{row.order}</td>
              <td>
                <span className={row.statusClass}>{row.statusText}</span>
              </td>
              <td className={STYLES.actionsCell}>
                <Link href={row.editHref} className={STYLES.editLink}>
                  {adminMessages.rowActions.edit}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
