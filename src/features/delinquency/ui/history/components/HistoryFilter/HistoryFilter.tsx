import { HISTORY_FILTERS } from '@/features/delinquency/domain/case-history'
import { HISTORY_PATH, historyMessages as copy } from '../../constants/history-strings'
import { historyFilterStyles as STYLES } from './HistoryFilter.styles'
import type { HistoryFilterProps } from './HistoryFilter.types'

export function HistoryFilter({ filter, pageSize }: HistoryFilterProps) {
  return (
    <form method="get" action={HISTORY_PATH} aria-label={copy.filter.formLabel} className={STYLES.form}>
      <input type="hidden" name="pageSize" value={pageSize} />
      <div className={STYLES.field}>
        <label htmlFor="history-filter" className={STYLES.label}>
          {copy.filter.selectLabel}
        </label>
        <select id="history-filter" name="filter" defaultValue={filter} className={STYLES.select}>
          {HISTORY_FILTERS.map((option) => (
            <option key={option} value={option}>
              {copy.filters[option]}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={STYLES.submit}>
        {copy.filter.submit}
      </button>
    </form>
  )
}
