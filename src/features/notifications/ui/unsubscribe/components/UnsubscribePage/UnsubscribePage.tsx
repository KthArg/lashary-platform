import { isUnsubscribeToken } from '@/features/notifications/domain/inactive-reminder-message'
import { unsubscribeMessages as copy } from '../../constants/unsubscribe-strings'
import { UnsubscribeForm } from '../UnsubscribeForm'
import { unsubscribePageStyles as STYLES } from './UnsubscribePage.styles'
import type { UnsubscribePageProps } from './UnsubscribePage.types'

export async function UnsubscribePage({ params }: UnsubscribePageProps) {
  const { token } = await params

  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{copy.title}</h1>
      {isUnsubscribeToken(token) ? (
        <UnsubscribeForm token={token} />
      ) : (
        <p role="alert" className={STYLES.invalid}>
          {copy.invalid}
        </p>
      )}
    </main>
  )
}
