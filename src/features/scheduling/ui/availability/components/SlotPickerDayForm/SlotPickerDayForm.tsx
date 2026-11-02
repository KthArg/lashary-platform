import Form from 'next/form'
import { schedulingMessages } from '@/features/scheduling/ui/messages'
import { AVAILABILITY_PATH, SLOT_PICKER_DATE_PARAM } from '../../constants/availability.constants'
import { slotPickerDayFormStyles as STYLES } from './SlotPickerDayForm.styles'
import type { SlotPickerDayFormProps } from './SlotPickerDayForm.types'

const pickerMessages = schedulingMessages.availability.picker

export function SlotPickerDayForm({ date }: SlotPickerDayFormProps) {
  return (
    <Form action={AVAILABILITY_PATH} className={STYLES.form}>
      <label className={STYLES.field}>
        <span className={STYLES.labelText}>{pickerMessages.dayLabel}</span>
        <input type="date" name={SLOT_PICKER_DATE_PARAM} defaultValue={date} className={STYLES.input} required />
      </label>
      <button type="submit" className={STYLES.submit}>
        {pickerMessages.showDay}
      </button>
    </Form>
  )
}
