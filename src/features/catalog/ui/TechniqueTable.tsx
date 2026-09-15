import Link from 'next/link'
import type { TechniqueView } from '../domain/technique'
import { catalogMessages, familyLabel } from './messages'
import { formatColones } from './format'
import { catalogRoutes } from './routes'
import { techniqueTableStyles as s } from './TechniqueTable.styles'

const m = catalogMessages.admin

function durationCell(technique: TechniqueView): string {
  const retouch =
    technique.durationRetouchMin === null
      ? m.notApplicable
      : `${technique.durationRetouchMin}`
  return `${technique.durationFirstTimeMin} / ${retouch} ${m.minutesShort}`
}

export function TechniqueTable({ items }: { items: TechniqueView[] }) {
  return (
    <div className={s.wrapper}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>{m.columns.name}</th>
            <th>{m.columns.family}</th>
            <th>{m.columns.priceFirstTime}</th>
            <th>{m.columns.priceRetouch}</th>
            <th>{m.columns.durations}</th>
            <th>{m.columns.buffer}</th>
            <th>{m.columns.reapplication}</th>
            <th>{m.columns.deposit}</th>
            <th>{m.columns.status}</th>
            <th>
              <span className={s.srOnly}>{m.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((technique) => (
            <tr key={technique.id}>
              <td className={s.nameCell}>{technique.name}</td>
              <td>{familyLabel(technique.family)}</td>
              <td>{formatColones(technique.priceFirstTime)}</td>
              <td>
                {technique.priceRetouch === null
                  ? m.notApplicable
                  : formatColones(technique.priceRetouch)}
              </td>
              <td>{durationCell(technique)}</td>
              <td>
                {technique.bufferMin} {m.minutesShort}
              </td>
              <td>
                {technique.reapplicationIntervalDays === null
                  ? m.notApplicable
                  : `${technique.reapplicationIntervalDays} ${m.daysShort}`}
              </td>
              <td>{formatColones(technique.deposit)}</td>
              <td>
                <span className={technique.isActive ? s.badgeActive : s.badgeInactive}>
                  {technique.isActive ? m.status.active : m.status.inactive}
                </span>
              </td>
              <td className={s.actionsCell}>
                <Link href={catalogRoutes.editTechnique(technique.id)} className={s.editLink}>
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
