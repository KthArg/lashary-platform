import Link from 'next/link'
import type { TechniqueView } from '../../../../domain/techniques/technique'
import { catalogMessages, familyLabel } from '../../constants/technique-strings'
import { formatColones } from '../../../format'
import { catalogRoutes } from '../../../routes'
import { techniqueTableStyles as STYLES } from './TechniqueTable.styles'
import type { TechniqueTableProps } from './TechniqueTable.types'

const adminMessages = catalogMessages.admin

function durationCell(technique: TechniqueView): string {
  const retouch =
    technique.durationRetouchMin === null
      ? adminMessages.notApplicable
      : `${technique.durationRetouchMin}`
  return `${technique.durationFirstTimeMin} / ${retouch} ${adminMessages.minutesShort}`
}

export function TechniqueTable({ items }: TechniqueTableProps) {
  return (
    <div className={STYLES.wrapper}>
      <table className={STYLES.table}>
        <thead>
          <tr>
            <th>{adminMessages.columns.name}</th>
            <th>{adminMessages.columns.family}</th>
            <th>{adminMessages.columns.priceFirstTime}</th>
            <th>{adminMessages.columns.priceRetouch}</th>
            <th>{adminMessages.columns.durations}</th>
            <th>{adminMessages.columns.buffer}</th>
            <th>{adminMessages.columns.reapplication}</th>
            <th>{adminMessages.columns.deposit}</th>
            <th>{adminMessages.columns.status}</th>
            <th>
              <span className={STYLES.srOnly}>{adminMessages.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((technique) => (
            <tr key={technique.id}>
              <td className={STYLES.nameCell}>{technique.name}</td>
              <td>{familyLabel(technique.family)}</td>
              <td>{formatColones(technique.priceFirstTime)}</td>
              <td>
                {technique.priceRetouch === null
                  ? adminMessages.notApplicable
                  : formatColones(technique.priceRetouch)}
              </td>
              <td>{durationCell(technique)}</td>
              <td>
                {technique.bufferMin} {adminMessages.minutesShort}
              </td>
              <td>
                {technique.reapplicationIntervalDays === null
                  ? adminMessages.notApplicable
                  : `${technique.reapplicationIntervalDays} ${adminMessages.daysShort}`}
              </td>
              <td>{formatColones(technique.deposit)}</td>
              <td>
                <span className={technique.isActive ? STYLES.badgeActive : STYLES.badgeInactive}>
                  {technique.isActive ? adminMessages.status.active : adminMessages.status.inactive}
                </span>
              </td>
              <td className={STYLES.actionsCell}>
                <Link href={catalogRoutes.editTechnique(technique.id)} className={STYLES.editLink}>
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
