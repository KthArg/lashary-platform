import type { ClosedDate } from '../domain/availability'
import { schedulingMessages } from './messages'
import { formatClosedDate } from './format'
import { closedDateTableStyles as s } from './ClosedDateTable.styles'

const m = schedulingMessages.closedDates

export function ClosedDateTable({ items }: { items: ClosedDate[] }) {
  if (items.length === 0) return <p>{m.empty}</p>

  return (
    <div className={s.wrapper}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>{m.columns.date}</th>
            <th>{m.columns.reason}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((closedDate) => (
            <tr key={closedDate.id}>
              <td className={s.dateCell}>{formatClosedDate(closedDate.closedDate)}</td>
              <td>{closedDate.reason ?? schedulingMessages.shared.notApplicable}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
