import { formatStudioDateTime } from '@/shared/studio-time'
import { CLIENT_RECORD_AFTERCARE_TEXTS, DELIVERY_STATE_TEXTS } from '../../constants/client-record-aftercare-strings'
import { clientRecordAftercareStyles as STYLES } from './ClientRecordAftercare.styles'
import type { ClientRecordAftercareProps } from './ClientRecordAftercare.types'

const TITLE_ID = 'client-record-aftercare-title'

export function ClientRecordAftercare({ result }: ClientRecordAftercareProps) {
  if (!result.ok) return <p role="alert" className={STYLES.error}>{CLIENT_RECORD_AFTERCARE_TEXTS.loadFailed}</p>

  return (
    <section aria-labelledby={TITLE_ID} className={STYLES.section}>
      <h2 id={TITLE_ID} className={STYLES.title}>{CLIENT_RECORD_AFTERCARE_TEXTS.title}</h2>
      {result.aftercare.length === 0 ? (
        <p className={STYLES.empty}>{CLIENT_RECORD_AFTERCARE_TEXTS.empty}</p>
      ) : (
        <ul className={STYLES.list}>
          {result.aftercare.map((aftercare) => (
            <li key={aftercare.id} className={STYLES.item}>
              <h3 className={STYLES.service}>{aftercare.serviceName}</h3>
              <time dateTime={aftercare.createdAt.toISOString()} className={STYLES.date}>
                {formatStudioDateTime(aftercare.createdAt)}
              </time>
              <p className={STYLES.delivery}>{DELIVERY_STATE_TEXTS[aftercare.deliveryState]}</p>
              <p className={STYLES.text}>{aftercare.aftercareText}</p>
              {aftercare.clientNote !== null && (
                <>
                  <h4 className={STYLES.noteTitle}>{CLIENT_RECORD_AFTERCARE_TEXTS.noteTitle}</h4>
                  <p className={STYLES.note}>{aftercare.clientNote}</p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
