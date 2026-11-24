import Link from 'next/link'
import { historyMessages as copy } from '../../constants/history-strings'
import { buildHistoryUrl } from '../../utils/history-url'
import { HistoryFilter } from '../HistoryFilter'
import { HistoryPagination } from '../HistoryPagination'
import { HistoryTable } from '../HistoryTable'
import { historyViewStyles as STYLES } from './HistoryView.styles'
import type { HistoryViewProps } from './HistoryView.types'

export function HistoryView({ model, query }: HistoryViewProps) {
  const header = (
    <header className={STYLES.header}>
      <h1 className={STYLES.title}>{copy.title}</h1>
      <p className={STYLES.subtitle}>{copy.subtitle}</p>
    </header>
  )

  if (model.status === 'error') {
    return (
      <div className={STYLES.main}>
        {header}
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadError}</span>
          <Link href={buildHistoryUrl(query)} className={STYLES.retry}>
            {copy.retry}
          </Link>
        </div>
      </div>
    )
  }

  const { items, total, appointmentsUnavailable } = model.page

  return (
    <div className={STYLES.main}>
      {header}
      <HistoryFilter filter={query.filter} pageSize={query.pageSize} />
      {appointmentsUnavailable ? <p role="status" className={STYLES.notice}>{copy.appointmentsUnavailable}</p> : null}
      {items.length === 0 ? (
        <p className={STYLES.empty}>{query.filter === 'all' ? copy.emptyAll : copy.emptyFiltered}</p>
      ) : (
        <HistoryTable items={items} />
      )}
      {total > 0 ? <HistoryPagination query={query} total={total} /> : null}
    </div>
  )
}
