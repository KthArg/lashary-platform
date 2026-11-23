import { INACTIVE_RANGE_DAYS } from '@/features/notifications/domain/inactive-reminder'
import { INACTIVE_CLIENTS_PATH, INACTIVE_CLIENTS_QUERY, inactiveClientsMessages as copy } from '../../constants/inactive-clients-strings'
import { inactiveRangeFilterStyles as STYLES } from './InactiveRangeFilter.styles'
import type { InactiveRangeFilterProps } from './InactiveRangeFilter.types'

const RANGE_FIELD_ID = 'inactive-clients-range'

export function InactiveRangeFilter({ rangeDays }: InactiveRangeFilterProps) {
  return (
    <form method="get" action={INACTIVE_CLIENTS_PATH} className={STYLES.form}>
      <label htmlFor={RANGE_FIELD_ID} className={STYLES.label}>
        {copy.rangeLabel}
      </label>
      <select id={RANGE_FIELD_ID} name={INACTIVE_CLIENTS_QUERY.range} defaultValue={String(rangeDays)} className={STYLES.select}>
        {INACTIVE_RANGE_DAYS.map((days) => (
          <option key={days} value={String(days)}>
            {copy.rangeOption(days)}
          </option>
        ))}
      </select>
      <button type="submit" className={STYLES.submit}>
        {copy.apply}
      </button>
    </form>
  )
}
