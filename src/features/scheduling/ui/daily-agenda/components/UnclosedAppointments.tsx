import Link from 'next/link'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import { dailyAgendaStyles as STYLES } from '../styles/daily-agenda.styles'
import type { UnclosedSectionView } from '../types/daily-agenda.types'

export function UnclosedAppointments({ section }: { section: UnclosedSectionView }) {
  if (section.status === 'error') {
    return (
      <p role="alert" className={STYLES.alertError}>
        {COPY.unclosed.loadError}
      </p>
    )
  }

  return (
    <section aria-labelledby="unclosed-title" className={STYLES.unclosed}>
      <div>
        <h2 id="unclosed-title" className={STYLES.unclosedTitle}>
          {COPY.unclosed.title}
        </h2>
        <p>{COPY.unclosed.description}</p>
      </div>
      {section.truncatedNotice ? <p>{section.truncatedNotice}</p> : null}
      <ul className={STYLES.unclosedList}>
        {section.items.map((item) => (
          <li key={item.id} className={STYLES.unclosedItem}>
            <span>
              <span className={STYLES.unclosedWhen}>{item.when}</span> · {item.clientName} · {item.technique}
            </span>
            <Link
              href={item.dayHref}
              aria-label={COPY.unclosed.openDayLabel(item.clientName, item.dayLabel)}
              className={STYLES.action}
            >
              {COPY.unclosed.openDay}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
