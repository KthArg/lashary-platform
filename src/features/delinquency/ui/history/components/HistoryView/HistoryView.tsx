import Link from 'next/link'
import { historyMessages as copy } from '../../constants/history-strings'
import { buildHistoryUrl } from '../../utils/history-url'
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

  const { items, appointmentsUnavailable } = model.page

  return (
    <div className={STYLES.main}>
      {header}
      {appointmentsUnavailable ? <p role="status" className={STYLES.notice}>{copy.appointmentsUnavailable}</p> : null}
      {items.length === 0 ? (
        <p className={STYLES.empty}>{query.filter === 'all' ? copy.emptyAll : copy.emptyFiltered}</p>
      ) : (
        <HistoryTable items={items} />
      )}
    </div>
  )
}
