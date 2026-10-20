import Link from 'next/link'
import { bookingConfirmMessages } from '../../constants/booking-confirm-strings'
import { bookingConfirmViewStyles as STYLES } from './BookingConfirmView.styles'
import type { BookingConfirmViewProps } from './BookingConfirmView.types'

function BookingBody({ view }: BookingConfirmViewProps) {
  const copy = bookingConfirmMessages

  switch (view.status) {
    case 'forbidden':
      return (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.accessDenied}</span>
        </div>
      )
    case 'invalid':
    case 'unavailable':
      return (
        <section className={STYLES.card}>
          <div role="alert" className={STYLES.alertError}>
            <span>{view.status === 'invalid' ? copy.invalid : copy.unavailable}</span>
          </div>
          <Link href={view.backHref} className={STYLES.back}>
            {copy.changeSlot}
          </Link>
        </section>
      )
    case 'ready':
      return (
        <section className={STYLES.card}>
          <dl className={STYLES.details}>
            <dt className={STYLES.term}>{copy.serviceLabel}</dt>
            <dd className={STYLES.value}>{view.summary.service}</dd>
            <dt className={STYLES.term}>{copy.whenLabel}</dt>
            <dd className={STYLES.value}>{view.summary.when}</dd>
            <dt className={STYLES.term}>{copy.durationLabel}</dt>
            <dd className={STYLES.value}>{view.summary.duration}</dd>
            <dt className={STYLES.term}>{copy.priceLabel}</dt>
            <dd className={STYLES.value}>{view.summary.price}</dd>
            <dt className={STYLES.term}>{copy.depositLabel}</dt>
            <dd className={STYLES.value}>{view.summary.deposit}</dd>
          </dl>
          {view.summary.depositNotice && (
            <p role="note" className={STYLES.notice}>
              {view.summary.depositNotice}
            </p>
          )}
          <Link href={view.backHref} className={STYLES.back}>
            {copy.changeSlot}
          </Link>
        </section>
      )
  }
}

export function BookingConfirmView({ view }: BookingConfirmViewProps) {
  const copy = bookingConfirmMessages

  return (
    <div className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      <BookingBody view={view} />
    </div>
  )
}
