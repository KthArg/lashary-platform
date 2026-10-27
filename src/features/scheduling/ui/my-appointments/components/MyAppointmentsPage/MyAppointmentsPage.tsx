import { myAppointmentsService } from '../../services/my-appointments-service'
import { MyAppointmentsView } from '../MyAppointmentsView'

export async function MyAppointmentsPage() {
  return <MyAppointmentsView view={await myAppointmentsService.load()} />
}
