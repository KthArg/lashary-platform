import type { ReactNode } from 'react'
import type { MyAppointmentsScreen } from '../../types/my-appointments.types'

export interface MyAppointmentsViewProps {
  view: MyAppointmentsScreen
  notices?: ReactNode
}
