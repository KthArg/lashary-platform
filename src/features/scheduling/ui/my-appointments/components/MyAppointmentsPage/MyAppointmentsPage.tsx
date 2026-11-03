import type { ReactNode } from 'react'
import { myAppointmentsService } from '../../services/my-appointments-service'
import { MyAppointmentsView } from '../MyAppointmentsView'

export async function MyAppointmentsPage({ notices }: { notices?: ReactNode }) {
  return <MyAppointmentsView view={await myAppointmentsService.load()} notices={notices} />
}
