import { myAppointmentsMessages } from '../../constants/my-appointments-strings'
import { myAppointmentsLoadingStyles as STYLES } from './MyAppointmentsLoading.styles'

export function MyAppointmentsLoading() {
  return (
    <div role="status" aria-live="polite" className={STYLES.box}>
      {myAppointmentsMessages.loading}
    </div>
  )
}
