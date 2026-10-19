import Link from 'next/link'
import { ALERTS_PATH, alertsMessages } from '../constants/alerts-strings'
import { alertsStyles as STYLES } from '../styles/alerts.styles'
import type { AlertsViewModel } from '../types/alerts.types'

function AlertsBody({ view }: { view: AlertsViewModel }) {
  const copy = alertsMessages

  switch (view.status) {
    case 'error':
      return (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadError}</span>
          <Link href={ALERTS_PATH} className={STYLES.retry}>
            {copy.retry}
          </Link>
        </div>
      )
    case 'empty':
      return <p className={STYLES.empty}>{copy.empty}</p>
    case 'ready':
      return (
        <ul className={STYLES.list}>
          {view.alerts.map((alert) => (
            <li key={alert.id} className={STYLES.card}>
              <h2 className={STYLES.cardTitle}>{alert.title}</h2>
              <p className={STYLES.cardDetail}>{alert.detail}</p>
              <dl className={STYLES.meta}>
                <dt className={STYLES.term}>{copy.requestedLabel}</dt>
                <dd>{alert.requested}</dd>
                <dt className={STYLES.term}>{copy.recordedLabel}</dt>
                <dd>{alert.recorded}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )
  }
}

export function AlertsView({ view }: { view: AlertsViewModel }) {
  return (
    <div className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{alertsMessages.title}</h1>
        <p className={STYLES.subtitle}>{alertsMessages.subtitle}</p>
      </header>
      <AlertsBody view={view} />
    </div>
  )
}
