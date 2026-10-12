import type { WeeklyAvailabilityBlock } from '../domain/availability'
import { dayLabel, schedulingMessages } from './messages'
import { formatTime } from './format'
import { weeklyAvailabilityTableStyles as s } from './WeeklyAvailabilityTable.styles'

const m = schedulingMessages.weeklyAvailability

export function WeeklyAvailabilityTable({ items }: { items: WeeklyAvailabilityBlock[] }) {
  if (items.length === 0) return <p>{m.empty}</p>

  return (
    <div className={s.wrapper}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>{m.columns.day}</th>
            <th>{m.columns.hours}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((block) => (
            <tr key={block.id}>
              <td className={s.dayCell}>{dayLabel(block.dayOfWeek)}</td>
              <td>
                {formatTime(block.startTime)} – {formatTime(block.endTime)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
