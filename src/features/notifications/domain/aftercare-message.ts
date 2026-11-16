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

export const CLIENT_RECORD_AFTERCARE_PAGE_SIZE = 20

export type AftercareDeliveryState = 'sentWhatsapp' | 'sentEmail' | 'sent' | 'pending' | 'failed'

export type AdminAftercare = ClientAftercare & { deliveryState: AftercareDeliveryState }

export function deliveryStateOf(status: 'pending' | 'claimed' | 'sent' | 'failed', lastChannel: 'whatsapp' | 'email' | null): AftercareDeliveryState {
  if (status === 'failed') return 'failed'
  if (status !== 'sent') return 'pending'
  if (lastChannel === 'whatsapp') return 'sentWhatsapp'
  if (lastChannel === 'email') return 'sentEmail'
  return 'sent'
}
