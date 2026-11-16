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

export const MY_AFTERCARE_PAGE_SIZE = 10

export type ClientAftercare = Pick<AftercareMessage, 'id' | 'appointmentId' | 'serviceName' | 'aftercareText' | 'clientNote' | 'createdAt'>
