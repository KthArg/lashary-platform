import { clientCalendarMessages } from '../../client-calendar/constants/client-calendar-strings'
import type { SlotView } from '../../client-calendar/types/client-calendar.types'
import { RESCHEDULE_SLOT_FIELD } from '../constants/reschedule-form-fields'
import { reschedulePageMessages } from '../constants/reschedule-page-strings'
import { rescheduleStyles as STYLES } from '../styles/reschedule.styles'

export function RescheduleSlotList({ slots }: { slots: SlotView[] }) {
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
                  value={slot.startMin}
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
