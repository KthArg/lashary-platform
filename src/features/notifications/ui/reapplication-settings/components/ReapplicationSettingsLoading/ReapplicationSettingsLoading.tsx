import { reapplicationSettingsMessages } from '../../constants/reapplication-settings-strings'
import { reapplicationSettingsLoadingStyles as STYLES } from './ReapplicationSettingsLoading.styles'

export function ReapplicationSettingsLoading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{reapplicationSettingsMessages.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.box}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{reapplicationSettingsMessages.loading}</span>
      </div>
    </main>
  )
}
