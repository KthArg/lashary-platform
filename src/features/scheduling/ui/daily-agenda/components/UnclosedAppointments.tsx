'use client'

import Link from 'next/link'
import { useState } from 'react'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import { dailyAgendaStyles as STYLES } from '../styles/daily-agenda.styles'
import type { UnclosedSectionView } from '../types/daily-agenda.types'
import { CloseAppointmentControl } from './CloseAppointmentControl'

export function UnclosedAppointments({ section }: { section: UnclosedSectionView | null }) {
  const [notice, setNotice] = useState<string | null>(null)
  const noticeElement = notice ? (
    <p role="status" className={STYLES.closeNotice}>
      {notice}
    </p>
  ) : null

  if (section === null) return noticeElement

  if (section.status === 'error') {
    return (
      <>
        {noticeElement}
        <p role="alert" className={STYLES.alertError}>
          {COPY.unclosed.loadError}
        </p>
      </>
    )
  }

  return (
    <>
      {noticeElement}
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
              <div className={STYLES.actions}>
                {item.options.length > 0 ? <CloseAppointmentControl item={item} onClosed={setNotice} /> : null}
                <Link
                  href={item.dayHref}
                  aria-label={COPY.unclosed.openDayLabel(item.clientName, item.dayLabel)}
                  className={STYLES.action}
                >
                  {COPY.unclosed.openDay}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
