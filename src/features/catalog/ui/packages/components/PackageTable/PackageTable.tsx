import Link from 'next/link'
import type { PackageListItem } from '../../../../application/packages/queries'
import { packageMessages } from '../../constants/package-strings'
import { formatColones } from '../../../format'
import { catalogRoutes } from '../../../routes'
import { packageTableStyles as STYLES } from './PackageTable.styles'
import type { PackageTableProps } from './PackageTable.types'

const adminMessages = packageMessages.admin

function techniquesCell(
  pkg: PackageListItem,
  techniqueNameById: Map<string, string>,
  inactiveTechniqueIds: Set<string>,
): string {
  return pkg.techniqueIds
    .map((id) => {
      const name = techniqueNameById.get(id) ?? id
      return inactiveTechniqueIds.has(id) ? `${name} ${adminMessages.inactiveTechnique}` : name
    })
    .join(', ')
}

export function PackageTable({
  items,
  techniqueNameById,
  inactiveTechniqueIds = new Set(),
}: PackageTableProps) {
  return (
    <div className={STYLES.wrapper}>
      <table className={STYLES.table}>
        <thead>
          <tr>
            <th>{adminMessages.columns.name}</th>
            <th>{adminMessages.columns.techniques}</th>
            <th>{adminMessages.columns.duration}</th>
            <th>{adminMessages.columns.price}</th>
            <th>{adminMessages.columns.deposit}</th>
            <th>{adminMessages.columns.status}</th>
            <th>
              <span className={STYLES.srOnly}>{adminMessages.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((pkg) => (
            <tr key={pkg.id}>
              <td className={STYLES.nameCell}>{pkg.name}</td>
              <td>{techniquesCell(pkg, techniqueNameById, inactiveTechniqueIds)}</td>
              <td>
                {pkg.durationTotalMin} {adminMessages.minutesShort}
              </td>
              <td>{formatColones(pkg.price)}</td>
              <td>{formatColones(pkg.deposit)}</td>
              <td>
                <span className={pkg.isActive ? STYLES.badgeActive : STYLES.badgeInactive}>
                  {pkg.isActive ? adminMessages.status.active : adminMessages.status.inactive}
                </span>
              </td>
              <td className={STYLES.actionsCell}>
                <Link href={catalogRoutes.editPackage(pkg.id)} className={STYLES.editLink}>
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
