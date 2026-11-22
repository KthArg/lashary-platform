import Link from 'next/link'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDateTime } from '@/shared/studio-time'
import { ACTIVE_LIST_LIMIT, REVIEW_LIST_LIMIT } from '@/features/delinquency/domain/active-client'
import { EXCEPTION_HISTORY_LIST_LIMIT } from '@/features/delinquency/domain/delinquency-case'
import type { ExceptionHistoryItem } from '@/features/delinquency/application/load-review'
import { DELINQUENCY_ADMIN_PATH, reviewMessages as copy } from '@/features/delinquency/ui/review/constants/review-strings'
import { CaseDecisionButtons } from '../CaseDecisionButtons'
import { CaseExceptionActions } from '../CaseExceptionActions'
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

  const { toReview, active, lifted, forgiven, moreToReview, moreActive, moreLifted, moreForgiven } = model.view

  const historyList = (items: ExceptionHistoryItem[]) => (
    <ul className={STYLES.list}>
      {items.map((item) => (
        <li key={item.caseId} className={STYLES.historyCard}>
          <h3 className={STYLES.cardTitle}>{item.clientName ?? copy.clientFallback}</h3>
          <dl className={STYLES.meta}>
            <dt className={STYLES.term}>{copy.pendingLabel}</dt>
            <dd>{amount(item.pending)}</dd>
            {item.exceptionAmount !== null ? (
              <>
                <dt className={STYLES.term}>{copy.exception.forgivenAmountLabel}</dt>
                <dd>{amount(item.exceptionAmount)}</dd>
              </>
            ) : null}
            {item.decidedAt ? (
              <>
                <dt className={STYLES.term}>{copy.decidedLabel}</dt>
                <dd>{formatStudioDateTime(item.decidedAt)}</dd>
              </>
            ) : null}
            {item.exceptionReason ? (
              <>
                <dt className={STYLES.term}>{copy.exception.reasonLabel}</dt>
                <dd>{item.exceptionReason}</dd>
              </>
            ) : null}
          </dl>
        </li>
      ))}
    </ul>
  )

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
              <li key={item.caseId} className={STYLES.activeCard}>
                <h3 className={STYLES.cardTitle}>{item.clientName ?? copy.clientFallback}</h3>
                <dl className={STYLES.meta}>
                  <dt className={STYLES.term}>{copy.pendingLabel}</dt>
                  <dd>{amount(item.pending)}</dd>
                  <dt className={STYLES.term}>{copy.sinceLabel}</dt>
                  <dd>{formatStudioDateTime(item.since)}</dd>
                  {item.exceptionAmount !== null ? (
                    <>
                      <dt className={STYLES.term}>{copy.exception.alreadyForgivenLabel}</dt>
                      <dd>{amount(item.exceptionAmount)}</dd>
                    </>
                  ) : null}
                </dl>
                <CaseExceptionActions caseId={item.caseId} pending={item.pending} />
              </li>
            ))}
          </ul>
        )}
        {moreActive ? <p className={STYLES.more}>{copy.active.more(ACTIVE_LIST_LIMIT)}</p> : null}
      </section>

      <section className={STYLES.section} aria-labelledby="delinquency-lifted">
        <h2 id="delinquency-lifted" className={STYLES.sectionTitle}>
          {copy.lifted.title}
        </h2>
        {lifted.length === 0 ? <p className={STYLES.empty}>{copy.lifted.empty}</p> : historyList(lifted)}
        {moreLifted ? <p className={STYLES.more}>{copy.lifted.more(EXCEPTION_HISTORY_LIST_LIMIT)}</p> : null}
      </section>

      <section className={STYLES.section} aria-labelledby="delinquency-forgiven">
        <h2 id="delinquency-forgiven" className={STYLES.sectionTitle}>
          {copy.forgiven.title}
        </h2>
        {forgiven.length === 0 ? <p className={STYLES.empty}>{copy.forgiven.empty}</p> : historyList(forgiven)}
        {moreForgiven ? <p className={STYLES.more}>{copy.forgiven.more(EXCEPTION_HISTORY_LIST_LIMIT)}</p> : null}
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
