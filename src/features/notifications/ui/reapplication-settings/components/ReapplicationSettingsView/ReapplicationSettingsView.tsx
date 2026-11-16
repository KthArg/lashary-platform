import Link from 'next/link'
import { REAPPLICATION_SETTINGS_PATH, reapplicationSettingsMessages } from '../../constants/reapplication-settings-strings'
import { AnticipationDaysForm } from '../AnticipationDaysForm'
import { reapplicationSettingsViewStyles as STYLES } from './ReapplicationSettingsView.styles'
import type { ReapplicationSettingsViewProps } from './ReapplicationSettingsView.types'

export function ReapplicationSettingsView({ view }: ReapplicationSettingsViewProps) {
  const copy = reapplicationSettingsMessages

  return (
    <main className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      {view.status === 'ready' ? (
        <section className={STYLES.section}>
          <AnticipationDaysForm anticipationDays={view.anticipationDays} />
        </section>
      ) : (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadFailed}</span>
          <Link href={REAPPLICATION_SETTINGS_PATH} className={STYLES.action}>
            {copy.reload}
          </Link>
        </div>
      )}
    </main>
  )
}
