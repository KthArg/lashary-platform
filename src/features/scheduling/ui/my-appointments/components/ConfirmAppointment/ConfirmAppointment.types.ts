export interface ConfirmAppointmentProps {
  appointmentId: string
  slot: string
  onConfirmed: (message: string) => void
}
