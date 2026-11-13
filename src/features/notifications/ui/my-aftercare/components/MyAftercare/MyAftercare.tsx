import { formatStudioDateTime } from '@/shared/studio-time'
import { MY_AFTERCARE_TEXTS } from '../../constants/my-aftercare-strings'
import { myAftercareStyles as STYLES } from './MyAftercare.styles'
import type { MyAftercareProps } from './MyAftercare.types'

const TITLE_ID = 'my-aftercare-title'

export function MyAftercare({ result }: MyAftercareProps) {
  if (!result.ok) return <p role="alert" className={STYLES.error}>{MY_AFTERCARE_TEXTS.loadFailed}</p>

  return (
    <section aria-labelledby={TITLE_ID} className={STYLES.section}>
      <h2 id={TITLE_ID} className={STYLES.title}>{MY_AFTERCARE_TEXTS.title}</h2>
      {result.aftercare.length === 0 ? (
        <p className={STYLES.empty}>{MY_AFTERCARE_TEXTS.empty}</p>
      ) : (
        <ul className={STYLES.list}>
          {result.aftercare.map((aftercare) => (
            <li key={aftercare.id} className={STYLES.item}>
              <h3 className={STYLES.service}>{aftercare.serviceName}</h3>
              <time dateTime={aftercare.createdAt.toISOString()} className={STYLES.date}>
                {formatStudioDateTime(aftercare.createdAt)}
              </time>
              <p className={STYLES.text}>{aftercare.aftercareText}</p>
              {aftercare.clientNote !== null && (
                <>
                  <h4 className={STYLES.noteTitle}>{MY_AFTERCARE_TEXTS.noteTitle}</h4>
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
