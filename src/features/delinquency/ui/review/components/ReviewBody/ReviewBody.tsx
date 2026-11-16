import Link from 'next/link'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDateTime } from '@/shared/studio-time'
import { ACTIVE_LIST_LIMIT, REVIEW_LIST_LIMIT } from '@/features/delinquency/domain/active-client'
import { DELINQUENCY_ADMIN_PATH, reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { CaseDecisionButtons } from '../CaseDecisionButtons'
import { GraceDaysForm } from '../GraceDaysForm'
import { reviewBodyStyles as STYLES } from './ReviewBody.styles'
import type { ReviewBodyProps } from './ReviewBody.types'

const amount = (colones: number): string => formatMoney(moneyFromColones(colones))

export function ReviewBody({ model }: ReviewBodyProps) {
  if (model.status === 'error') {
    return (
      <div role="alert" className={STYLES.alertError}>
        <span>{copy.loadError}</span>
        <Link href={DELINQUENCY_ADMIN_PATH} className={STYLES.retry}>
          {copy.retry}
        </Link>
      </div>
    )
  }

  const { toReview, active, moreToReview, moreActive } = model.view
  return (
    <>
      <section className={STYLES.section} aria-labelledby="delinquency-to-review">
        <h2 id="delinquency-to-review" className={STYLES.sectionTitle}>
          {copy.toReview.title}
        </h2>
        <p className={STYLES.hint}>{copy.toReview.hint}</p>
        {toReview.length === 0 ? (
          <p className={STYLES.empty}>{copy.toReview.empty}</p>
        ) : (
          <ul className={STYLES.list}>
            {toReview.map((item) => (
              <li key={item.caseId} className={STYLES.card}>
                <h3 className={STYLES.cardTitle}>{item.clientName ?? copy.clientFallback}</h3>
                <dl className={STYLES.meta}>
                  <dt className={STYLES.term}>{copy.pendingLabel}</dt>
                  <dd>{amount(item.pending)}</dd>
                  <dt className={STYLES.term}>{copy.detectedLabel}</dt>
                  <dd>{formatStudioDateTime(item.detectedAt)}</dd>
                </dl>
                <CaseDecisionButtons caseId={item.caseId} />
              </li>
            ))}
          </ul>
        )}
        {moreToReview ? <p className={STYLES.more}>{copy.toReview.more(REVIEW_LIST_LIMIT)}</p> : null}
      </section>

      <section className={STYLES.section} aria-labelledby="delinquency-active">
        <h2 id="delinquency-active" className={STYLES.sectionTitle}>
          {copy.active.title}
        </h2>
        {active.length === 0 ? (
          <p className={STYLES.empty}>{copy.active.empty}</p>
        ) : (
          <ul className={STYLES.list}>
            {active.map((item) => (
              <li key={item.clientId} className={STYLES.activeCard}>
                <h3 className={STYLES.cardTitle}>{item.clientName ?? copy.clientFallback}</h3>
                <dl className={STYLES.meta}>
                  <dt className={STYLES.term}>{copy.pendingLabel}</dt>
                  <dd>{amount(item.pending)}</dd>
                  <dt className={STYLES.term}>{copy.sinceLabel}</dt>
                  <dd>{formatStudioDateTime(item.since)}</dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
        {moreActive ? <p className={STYLES.more}>{copy.active.more(ACTIVE_LIST_LIMIT)}</p> : null}
      </section>

      <section className={STYLES.section} aria-labelledby="delinquency-grace">
        <h2 id="delinquency-grace" className={STYLES.sectionTitle}>
          {copy.grace.title}
        </h2>
        <p className={STYLES.hint}>{copy.grace.hint}</p>
        {model.graceDays === null ? (
          <p className={STYLES.empty}>{copy.grace.unavailable}</p>
        ) : (
          <GraceDaysForm graceDays={model.graceDays} />
        )}
      </section>
    </>
  )
}
