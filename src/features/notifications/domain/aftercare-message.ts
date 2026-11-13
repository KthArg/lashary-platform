export const AFTERCARE_NOTE_MAX_LENGTH = 1000

export type AftercareMessage = {
  id: string
  appointmentId: string
  clientId: string
  serviceName: string
  aftercareText: string
  clientNote: string | null
  attempts: number
  createdAt: Date
}
