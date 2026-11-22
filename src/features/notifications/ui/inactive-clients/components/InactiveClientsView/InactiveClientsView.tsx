import Link from 'next/link'
import { inactiveClientsMessages as copy } from '../../constants/inactive-clients-strings'
import { inactiveClientsUrl } from '../../utils/inactive-clients-url'
import { InactiveRangeFilter } from '../InactiveRangeFilter'
import { InactiveRemindersForm } from '../InactiveRemindersForm'
import { InactiveClientsPagination } from '../InactiveClientsPagination'
import { inactiveClientsViewStyles as STYLES } from './InactiveClientsView.styles'
import type { InactiveClientsViewProps } from './InactiveClientsView.types'

const SHORTEST_RANGE_DAYS = 30

export function InactiveClientsView({ screen }: InactiveClientsViewProps) {
  const rangeDays = screen.status === 'ready' ? screen.view.rangeDays : screen.rangeDays

  return (
    <main className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      <InactiveRangeFilter rangeDays={rangeDays} />
      {screen.status === 'error' ? (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadFailed}</span>
          <Link href={inactiveClientsUrl({ rangeDays, page: screen.page })} className={STYLES.action}>
            {copy.reload}
          </Link>
        </div>
      ) : screen.view.total === 0 ? (
        <div className={STYLES.empty}>
          <p>{copy.empty}</p>
          <Link href={inactiveClientsUrl({ rangeDays: SHORTEST_RANGE_DAYS, page: 1 })} className={STYLES.action}>
            {copy.emptyAction}
          </Link>
        </div>
      ) : (
        <section className={STYLES.section}>
          <p className={STYLES.total}>{copy.total(screen.view.total)}</p>
          <InactiveRemindersForm clients={screen.view.clients} />
          <InactiveClientsPagination
            rangeDays={rangeDays}
            page={screen.view.page}
            pageSize={screen.view.pageSize}
            total={screen.view.total}
          />
        </section>
      )}
    </main>
  )
}
