import type { ManualBlock } from '../domain/availability'
import { schedulingMessages } from './messages'
import { formatInstant } from './format'
import { manualBlockTableStyles as s } from './ManualBlockTable.styles'

const m = schedulingMessages.manualBlocks

export function ManualBlockTable({ items }: { items: ManualBlock[] }) {
  if (items.length === 0) return <p>{m.empty}</p>

  return (
    <div className={s.wrapper}>
      <table className={s.table}>
        <thead>
          <tr>
            <th>{m.columns.range}</th>
            <th>{m.columns.reason}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((block) => (
            <tr key={block.id}>
              <td className={s.rangeCell}>
                {formatInstant(block.startsAt)} – {formatInstant(block.endsAt)}
              </td>
              <td>{block.reason ?? schedulingMessages.shared.notApplicable}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
