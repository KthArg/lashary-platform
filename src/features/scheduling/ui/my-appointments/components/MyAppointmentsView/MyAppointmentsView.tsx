import Link from 'next/link'
import { BOOK_APPOINTMENT_PATH, myAppointmentsMessages } from '../../constants/my-appointments-strings'
import { MyAppointmentsContent } from '../MyAppointmentsContent'
import { myAppointmentsViewStyles as STYLES } from './MyAppointmentsView.styles'
import type { MyAppointmentsViewProps } from './MyAppointmentsView.types'

export function MyAppointmentsView({ view }: MyAppointmentsViewProps) {
  const copy = myAppointmentsMessages
  const canBook = view.status !== 'forbidden'

  return (
    <div className={STYLES.main}>
      <header className={STYLES.header}>
        <div>
          <h1 className={STYLES.title}>{copy.title}</h1>
          <p className={STYLES.subtitle}>{copy.subtitle}</p>
        </div>
        {canBook && (
          <Link href={BOOK_APPOINTMENT_PATH} className={STYLES.bookLink}>
            {copy.bookCta}
          </Link>
        )}
      </header>
      <MyAppointmentsContent view={view} />
    </div>
  )
}
