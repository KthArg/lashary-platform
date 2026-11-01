import { clientCalendarMessages } from '../../client-calendar/constants/client-calendar-strings'
import { RESCHEDULE_SLOT_FIELD } from '../constants/reschedule-form-fields'
import { reschedulePageMessages } from '../constants/reschedule-page-strings'
import { rescheduleStyles as STYLES } from '../styles/reschedule.styles'
import type { RescheduleSlotView } from '../types/reschedule-view.types'

type RescheduleSlotListProps = {
  slots: RescheduleSlotView[]
  selectedStartsAtMs: number | null
  onSelect: (startsAtMs: number) => void
}

export function RescheduleSlotList({ slots, selectedStartsAtMs, onSelect }: RescheduleSlotListProps) {
  const copy = clientCalendarMessages
  if (slots.length === 0) return <p className={STYLES.empty}>{copy.noSlots}</p>

  return (
    <fieldset className={STYLES.fieldset}>
      <legend className={STYLES.legend}>{reschedulePageMessages.slotsLegend}</legend>
      <ul className={STYLES.grid}>
        {slots.map((slot) => {
          const id = `${RESCHEDULE_SLOT_FIELD}-${slot.startMin}`
          return (
            <li key={slot.startMin}>
              <label htmlFor={id} className={slot.busy ? STYLES.slotBusy : STYLES.slotFree}>
                <input
                  id={id}
                  type="radio"
                  name={RESCHEDULE_SLOT_FIELD}
                  value={slot.startsAtMs}
                  checked={selectedStartsAtMs === slot.startsAtMs}
                  onChange={() => onSelect(slot.startsAtMs)}
                  disabled={slot.busy}
                  className={STYLES.radio}
                />
                <span className={STYLES.time}>{slot.range}</span>
                <span className={slot.busy ? STYLES.badgeBusy : STYLES.badgeFree}>
                  {slot.busy ? copy.busy : copy.free}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
