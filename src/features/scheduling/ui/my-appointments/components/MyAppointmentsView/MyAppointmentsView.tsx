import { myAppointmentsMessages } from '../../constants/my-appointments-strings'
import { MyAppointmentsContent } from '../MyAppointmentsContent'
import { myAppointmentsViewStyles as STYLES } from './MyAppointmentsView.styles'
import type { MyAppointmentsViewProps } from './MyAppointmentsView.types'

export function MyAppointmentsView({ view }: MyAppointmentsViewProps) {
  const copy = myAppointmentsMessages

  return (
    <div className={STYLES.main}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{copy.title}</h1>
        <p className={STYLES.subtitle}>{copy.subtitle}</p>
      </header>
      <MyAppointmentsContent view={view} />
    </div>
  )
}
