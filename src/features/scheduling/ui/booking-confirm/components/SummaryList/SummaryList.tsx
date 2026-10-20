import { bookingConfirmMessages } from '../../constants/booking-confirm-strings'
import { summaryListStyles as STYLES } from './SummaryList.styles'
import type { SummaryListProps } from './SummaryList.types'

export function SummaryList({ summary }: SummaryListProps) {
  const copy = bookingConfirmMessages

  return (
    <>
      <dl className={STYLES.details}>
        <dt className={STYLES.term}>{copy.serviceLabel}</dt>
        <dd className={STYLES.value}>{summary.service}</dd>
        <dt className={STYLES.term}>{copy.whenLabel}</dt>
        <dd className={STYLES.value}>{summary.when}</dd>
        <dt className={STYLES.term}>{copy.durationLabel}</dt>
        <dd className={STYLES.value}>{summary.duration}</dd>
        <dt className={STYLES.term}>{copy.priceLabel}</dt>
        <dd className={STYLES.value}>{summary.price}</dd>
        <dt className={STYLES.term}>{copy.depositLabel}</dt>
        <dd className={STYLES.value}>{summary.deposit}</dd>
      </dl>
      {summary.promotionNotice && (
        <p role="note" className={STYLES.notice}>
          {summary.promotionNotice}
        </p>
      )}
      {summary.depositNotice && (
        <p role="note" className={STYLES.notice}>
          {summary.depositNotice}
        </p>
      )}
    </>
  )
}
