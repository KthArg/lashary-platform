import { buildClientNoticeMessage } from '@/features/notifications/domain/client-notice-message'
import { CLIENT_NOTICES_TEXTS } from '../../constants/client-notices-strings'
import { clientNoticesStyles as STYLES } from './ClientNotices.styles'
import type { ClientNoticesProps } from './ClientNotices.types'

const TITLE_ID = 'client-notices-title'

export function ClientNotices({ result }: ClientNoticesProps) {
  if (!result.ok) return <p role="alert" className={STYLES.error}>{CLIENT_NOTICES_TEXTS.loadFailed}</p>
  if (result.notices.length === 0) return null

  return (
    <section aria-labelledby={TITLE_ID} className={STYLES.section}>
      <h2 id={TITLE_ID} className={STYLES.title}>{CLIENT_NOTICES_TEXTS.title}</h2>
      <ul className={STYLES.list}>
        {result.notices.map((notice) => (
          <li key={notice.id} className={STYLES.item}>{buildClientNoticeMessage(notice)}</li>
        ))}
      </ul>
    </section>
  )
}
