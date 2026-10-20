import Form from 'next/form'
import { BOOKING_CONFIRM_PATH } from '../../../booking-confirm/constants/booking-confirm-strings'
import { CALENDAR_PARAMS, SLOT_FIELD, clientCalendarMessages } from '../../constants/client-calendar-strings'
import { slotListStyles as STYLES } from './SlotList.styles'
import type { SlotListProps } from './SlotList.types'

export function SlotList({ slots, serviceKey, date }: SlotListProps) {
  const copy = clientCalendarMessages
  if (slots.length === 0) return <p className={STYLES.empty}>{copy.noSlots}</p>

  return (
    <Form action={BOOKING_CONFIRM_PATH} className={STYLES.form}>
      <fieldset className={STYLES.fieldset}>
        <legend className={STYLES.legend}>{copy.slotsLegend}</legend>
        <ul className={STYLES.grid}>
          {slots.map((slot) => {
            const id = `slot-${slot.startMin}`
            return (
              <li key={slot.startMin}>
                <label htmlFor={id} className={slot.busy ? STYLES.slotBusy : STYLES.slotFree}>
                  <input id={id} type="radio" name={SLOT_FIELD} value={slot.startMin} disabled={slot.busy} required className={STYLES.radio} />
                  <span className={STYLES.time}>{slot.range}</span>
                  <span className={slot.busy ? STYLES.badgeBusy : STYLES.badgeFree}>{slot.busy ? copy.busy : copy.free}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>
      <input type="hidden" name={CALENDAR_PARAMS.service} value={serviceKey} />
      <input type="hidden" name={CALENDAR_PARAMS.date} value={date} />
      <button type="submit" disabled={slots.every((slot) => slot.busy)} className={STYLES.submit}>
        {copy.continueToConfirm}
      </button>
    </Form>
  )
}
