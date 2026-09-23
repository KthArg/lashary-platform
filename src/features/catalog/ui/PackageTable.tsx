import Link from 'next/link'
import type { PackageListItem } from '../application/queries'
import { catalogMessages } from './messages'
import { formatColones } from './format'
import { catalogRoutes } from './routes'
import { packageTableStyles as s } from './PackageTable.styles'

const m = catalogMessages.packages.admin

function techniquesCell(
  pkg: PackageListItem,
  techniqueNameById: Map<string, string>,
): string {
  return pkg.techniqueIds.map((id) => techniqueNameById.get(id) ?? id).join(', ')
}

export function PackageTable({
  items,
  techniqueNameById,
}: {
  items: PackageListItem[]
  techniqueNameById: Map<string, string>
}) {
  return (
    <div className={s.wrapper}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>{m.columns.name}</th>
            <th>{m.columns.techniques}</th>
            <th>{m.columns.duration}</th>
            <th>{m.columns.price}</th>
            <th>{m.columns.status}</th>
            <th>
              <span className={s.srOnly}>{m.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((pkg) => (
            <tr key={pkg.id}>
              <td className={s.nameCell}>{pkg.name}</td>
              <td>{techniquesCell(pkg, techniqueNameById)}</td>
              <td>
                {pkg.durationTotalMin} {m.minutesShort}
              </td>
              <td>{formatColones(pkg.price)}</td>
              <td>
                <span className={pkg.isActive ? s.badgeActive : s.badgeInactive}>
                  {pkg.isActive ? m.status.active : m.status.inactive}
                </span>
              </td>
              <td className={s.actionsCell}>
                <Link href={catalogRoutes.editPackage(pkg.id)} className={s.editLink}>
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
