import Link from 'next/link'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import { dailyAgendaStyles as STYLES } from '../styles/daily-agenda.styles'
import type { AgendaDayNav, AgendaEntryView, DailyAgendaViewModel } from '../types/daily-agenda.types'

function DayNav({ nav }: { nav: AgendaDayNav }) {
  return (
    <nav aria-label={COPY.dayNavLabel} className={STYLES.nav}>
      <h2 className={STYLES.dayLabel} aria-live="polite">
        {nav.dayLabel}
      </h2>
      <div className={STYLES.navLinks}>
        <Link href={nav.previousHref} className={STYLES.navLink}>
          {COPY.previousDay}
        </Link>
        {nav.isToday ? null : (
          <Link href={nav.todayHref} className={STYLES.navToday}>
            {COPY.today}
          </Link>
        )}
        <Link href={nav.nextHref} className={STYLES.navLink}>
          {COPY.nextDay}
        </Link>
      </div>
    </nav>
  )
}

const cardStyleOf = (entry: AgendaEntryView): string => {
  if (entry.isPending) return STYLES.cardPending
  return entry.isRejected ? STYLES.cardRejected : STYLES.card
}

const statusStyleOf = (entry: AgendaEntryView): string => {
  if (entry.isPending) return STYLES.statusPending
  return entry.isRejected ? STYLES.statusRejected : STYLES.status
}

function AgendaItem({ entry }: { entry: AgendaEntryView }) {
  return (
    <li className={cardStyleOf(entry)}>
      <div className={STYLES.cardTop}>
        <span className={STYLES.time}>{entry.time}</span>
        <span className={statusStyleOf(entry)}>{entry.status}</span>
      </div>
      <p className={STYLES.client}>{entry.clientName}</p>
      <div className={STYLES.tags}>
        <span className={STYLES.tag}>{entry.technique}</span>
        {entry.visit ? <span className={STYLES.tag}>{entry.visit}</span> : null}
        {entry.delinquency ? <span className={STYLES.delinquent}>{entry.delinquency}</span> : null}
      </div>
      <dl className={STYLES.meta}>
        <dt className={STYLES.term}>{COPY.labels.duration}</dt>
        <dd>{entry.duration}</dd>
        <dt className={STYLES.term}>{COPY.labels.payment}</dt>
        <dd>{entry.payment}</dd>
      </dl>
      {entry.links ? (
        <div className={STYLES.actions}>
          <Link href={entry.links.record} aria-label={entry.links.recordLabel} className={STYLES.action}>
            {COPY.openRecord}
          </Link>
          <Link href={entry.links.appointments} aria-label={entry.links.appointmentsLabel} className={STYLES.action}>
            {COPY.clientAppointments}
          </Link>
        </div>
      ) : null}
    </li>
  )
}

function AgendaBody({ view }: { view: DailyAgendaViewModel }) {
  switch (view.status) {
    case 'error':
      return (
        <div role="alert" className={STYLES.alertError}>
          <span>{COPY.loadError}</span>
          <Link href={view.nav.currentHref} className={STYLES.retry}>
            {COPY.retry}
          </Link>
        </div>
      )
    case 'empty':
      return <p className={STYLES.empty}>{COPY.empty}</p>
    case 'ready':
      return (
        <>
          {view.truncatedNotice ? <p className={STYLES.truncated}>{view.truncatedNotice}</p> : null}
          <ul aria-label={COPY.listLabel(view.nav.dayLabel)} className={STYLES.list}>
            {view.entries.map((entry) => (
              <AgendaItem key={entry.id} entry={entry} />
            ))}
          </ul>
        </>
      )
  }
}

export function DailyAgendaView({ view }: { view: DailyAgendaViewModel }) {
  return (
    <div className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{COPY.title}</h1>
        <p className={STYLES.subtitle}>{COPY.subtitle}</p>
      </header>
      <DayNav nav={view.nav} />
      <AgendaBody view={view} />
    </div>
  )
}
