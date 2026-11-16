import type { AftercareDeliveryState } from '@/features/notifications/domain/aftercare-message'

export const DELIVERY_STATE_TEXTS: Record<AftercareDeliveryState, string> = {
  sentWhatsapp: 'Enviada por WhatsApp',
  sentEmail: 'Enviada por correo',
  sent: 'Enviada',
  pending: 'Pendiente de envío',
  failed: 'No se pudo enviar',
}

export const CLIENT_RECORD_AFTERCARE_TEXTS = {
  title: 'Indicaciones enviadas',
  empty: 'Esta clienta todavía no tiene indicaciones enviadas.',
  noteTitle: 'Nota para esta clienta',
  loadFailed: 'No pudimos cargar las indicaciones enviadas. Recarga la página para intentar de nuevo.',
} as const
