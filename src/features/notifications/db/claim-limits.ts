import { CHANNEL_SEND_TIMEOUT_MS } from '../channels/send-timeout'

export const CLAIM_TTL_MINUTES = 10
export const CYCLE_MAX_DURATION_SECONDS = 300

const CHANNELS_PER_MESSAGE = 2

// Tres tipos de mensaje salen en serie en cada ciclo (recordatorios, avisos de cambio a la clienta y
// confirmaciones de asistencia), y a eso se suma un lugar de margen: la tanda se calcula como si fueran
// cuatro, así quedan segundos libres para vencer reagendados, reintentar avisos perdidos, descubrir y
// reconciliar. Sumar un tipo de mensaje obliga a revisar este número y claim-limits.test.ts.
export const MESSAGE_KINDS_SENT_PER_CYCLE = 3
const MARGIN_KINDS = 1
export const MESSAGE_KINDS_PER_CYCLE = MESSAGE_KINDS_SENT_PER_CYCLE + MARGIN_KINDS

// Una sola tanda y un solo TTL para los tres repositorios que reclaman mensajes.
export const CLAIM_BATCH_SIZE = Math.floor(
  (CYCLE_MAX_DURATION_SECONDS * 1000) / (CHANNEL_SEND_TIMEOUT_MS * CHANNELS_PER_MESSAGE * MESSAGE_KINDS_PER_CYCLE),
)
