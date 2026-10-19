import Form from 'next/form'
import { CALENDAR_PARAMS, CLIENT_CALENDAR_PATH, clientCalendarMessages } from '../../constants/client-calendar-strings'
import { servicePickerStyles as STYLES } from './ServicePicker.styles'
import type { ServicePickerProps } from './ServicePicker.types'

export function ServicePicker({ picker }: ServicePickerProps) {
  const copy = clientCalendarMessages

  return (
    <Form action={CLIENT_CALENDAR_PATH} className={STYLES.form}>
      <label className={STYLES.field} htmlFor="calendar-service">
        <span className={STYLES.labelText}>{copy.serviceLabel}</span>
        <select
          key={picker.selectedKey ?? ''}
          id="calendar-service"
          name={CALENDAR_PARAMS.service}
          defaultValue={picker.selectedKey ?? ''}
          required
          className={STYLES.select}
        >
          <option value="" disabled>
            {copy.servicePlaceholder}
          </option>
          {picker.options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <input type="hidden" name={CALENDAR_PARAMS.date} value={picker.date} />
      <button type="submit" className={STYLES.submit}>
        {copy.showSlots}
      </button>
    </Form>
  )
}
