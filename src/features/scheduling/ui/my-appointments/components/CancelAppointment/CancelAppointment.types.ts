export interface CancelAppointmentProps {
  appointmentId: string
  slot: string
  onCancelled: (message: string) => void
}
