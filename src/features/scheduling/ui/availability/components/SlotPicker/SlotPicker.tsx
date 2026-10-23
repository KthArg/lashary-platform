'use client'

import { useActionState } from 'react'
import { MAX_MANUAL_BLOCK_REASON_LENGTH } from '../../../../domain/manual-blocks.constants'
import { schedulingMessages } from '../../../messages'
import { blockSlotsAction } from '../../actions/availability-actions'
import { BLOCK_SLOTS_FIELDS } from '../../constants/availability.constants'
import { initialAvailabilityActionState } from '../../types/availability-action-state'
import { AvailabilityFeedback } from '../AvailabilityForms'
import { slotPickerStyles as STYLES } from './SlotPicker.styles'
import type { SlotPickerProps } from './SlotPicker.types'

const pickerMessages = schedulingMessages.availability.picker

export function SlotPicker({ picker }: SlotPickerProps) {
  const [state, formAction, pending] = useActionState(blockSlotsAction, initialAvailabilityActionState)
  if (picker.slots.length === 0) return <p className={STYLES.empty}>{pickerMessages.noSlots}</p>

  const reasonInputId = `pick-reason-${picker.date}`
  return (
    <>
      <form action={formAction} className={STYLES.form}>
        <input type="hidden" name={BLOCK_SLOTS_FIELDS.date} value={picker.date} />
        <fieldset className={STYLES.fieldset}>
          <legend className={STYLES.legend}>{pickerMessages.slotsLegend(picker.dateLabel)}</legend>
          <ul className={STYLES.grid}>
            {picker.slots.map((slot) => {
              const slotInputId = `pick-${picker.date}-${slot.startMin}`
              return (
                <li key={slot.startMin}>
                  <label htmlFor={slotInputId} className={slot.busy ? STYLES.slotBusy : STYLES.slotFree}>
                    <input
                      id={slotInputId}
                      type="checkbox"
                      name={BLOCK_SLOTS_FIELDS.slot}
                      value={slot.startMin}
                      disabled={slot.busy}
                      className={STYLES.checkbox}
                    />
                    <span className={STYLES.time}>{slot.range}</span>
                    <span className={slot.busy ? STYLES.badgeBusy : STYLES.badgeFree}>
                      {slot.busy ? pickerMessages.busy : pickerMessages.free}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>
        <label htmlFor={reasonInputId} className={STYLES.field}>
          <span className={STYLES.labelText}>{pickerMessages.reasonLabel}</span>
          <input
            id={reasonInputId}
            type="text"
            name={BLOCK_SLOTS_FIELDS.reason}
            maxLength={MAX_MANUAL_BLOCK_REASON_LENGTH}
            className={STYLES.input}
          />
        </label>
        <button type="submit" className={STYLES.submit} disabled={pending}>
          {pickerMessages.submit}
        </button>
      </form>
      <AvailabilityFeedback state={state} />
    </>
  )
}
