import { inactiveClientsMessages as copy } from '../../constants/inactive-clients-strings'
import { inactiveClientsLoadingStyles as STYLES } from './InactiveClientsLoading.styles'

export function InactiveClientsLoading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{copy.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.box}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{copy.loading}</span>
      </div>
    </main>
  )
}
