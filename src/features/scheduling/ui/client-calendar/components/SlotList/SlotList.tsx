import { clientCalendarMessages } from '../../constants/client-calendar-strings'
import { slotListStyles as STYLES } from './SlotList.styles'
import type { SlotListProps } from './SlotList.types'

export function SlotList({ slots }: SlotListProps) {
  const copy = clientCalendarMessages
  if (slots.length === 0) return <p className={STYLES.empty}>{copy.noSlots}</p>

  return (
    <fieldset className={STYLES.fieldset}>
      <legend className={STYLES.legend}>{copy.slotsLegend}</legend>
      <ul className={STYLES.grid}>
        {slots.map((slot) => {
          const id = `slot-${slot.startMin}`
          return (
            <li key={slot.startMin}>
              <label htmlFor={id} className={slot.busy ? STYLES.slotBusy : STYLES.slotFree}>
                <input id={id} type="radio" name="espacio" value={slot.startMin} disabled={slot.busy} className={STYLES.radio} />
                <span className={STYLES.time}>{slot.range}</span>
                <span className={slot.busy ? STYLES.badgeBusy : STYLES.badgeFree}>{slot.busy ? copy.busy : copy.free}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
