import Link from 'next/link'
import { clientCalendarMessages } from '../../constants/client-calendar-strings'
import { dayNavigatorStyles as STYLES } from './DayNavigator.styles'
import type { DayLabelProps, DayNavigatorProps } from './DayNavigator.types'

function DayLabel({ short, long }: DayLabelProps) {
  return (
    <>
      <span className={STYLES.labelShort}>{short}</span>
      <span className={STYLES.labelLong}>{long}</span>
    </>
  )
}

export function DayNavigator({ day }: DayNavigatorProps) {
  const copy = clientCalendarMessages
  const previousLabel = (
    <>
      <span aria-hidden="true">{copy.previousArrow}</span> <DayLabel short={copy.previousDayShort} long={copy.previousDay} />
    </>
  )

  return (
    <nav aria-label={copy.dayNavigation} className={STYLES.nav}>
      {day.previousHref ? (
        <Link href={day.previousHref} scroll={false} aria-label={copy.previousDay} className={STYLES.previous}>
          {previousLabel}
        </Link>
      ) : (
        <span aria-disabled="true" aria-label={copy.previousDay} className={STYLES.previousDisabled}>
          {previousLabel}
        </span>
      )}
      <h2 className={STYLES.title} aria-live="polite">
        {day.title}
      </h2>
      <Link href={day.nextHref} scroll={false} aria-label={copy.nextDay} className={STYLES.next}>
        <DayLabel short={copy.nextDayShort} long={copy.nextDay} /> <span aria-hidden="true">{copy.nextArrow}</span>
      </Link>
    </nav>
  )
}
