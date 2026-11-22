import {
  INACTIVE_REMINDER_MIN_DAYS_BETWEEN,
  type InactiveQueueOutcome,
} from '@/features/notifications/domain/inactive-reminder'

export const INACTIVE_SEND_FIELDS = { selected: 'clientId', single: 'single' } as const

const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many)

const queued = (count: number): string =>
  count === 0
    ? 'No quedó ningún recordatorio en cola.'
    : plural(count, 'Quedó 1 recordatorio en cola.', `Quedaron ${count} recordatorios en cola.`)

function skippedReasons(outcome: InactiveQueueOutcome): string[] {
  const reasons: string[] = []
  if (outcome.alreadyQueued > 0) {
    reasons.push(plural(outcome.alreadyQueued, '1 ya tenía uno en cola', `${outcome.alreadyQueued} ya tenían uno en cola`))
  }
  if (outcome.optedOut > 0) {
    reasons.push(plural(outcome.optedOut, '1 se dio de baja', `${outcome.optedOut} se dieron de baja`))
  }
  if (outcome.recent > 0) {
    reasons.push(
      plural(
        outcome.recent,
        `1 recibió uno hace menos de ${INACTIVE_REMINDER_MIN_DAYS_BETWEEN} días`,
        `${outcome.recent} recibieron uno hace menos de ${INACTIVE_REMINDER_MIN_DAYS_BETWEEN} días`,
      ),
    )
  }
  if (outcome.unknown > 0) {
    reasons.push(plural(outcome.unknown, '1 ya no está registrada', `${outcome.unknown} ya no están registradas`))
  }
  return reasons
}

export const inactiveSendMessages = {
  columnSelect: 'Elegir',
  columnSend: 'Enviar',
  select: (name: string) => `Elegir a ${name}`,
  sendOneLabel: 'Enviar',
  sendOne: (name: string) => `Enviar recordatorio a ${name}`,
  sendSelected: 'Enviar a las marcadas',
  sending: 'Enviando…',
  hint: 'El recordatorio sale por correo en la próxima corrida del ciclo de notificaciones.',
  queued,
  outcome: (outcome: InactiveQueueOutcome): string => {
    const reasons = skippedReasons(outcome)
    return reasons.length === 0 ? queued(outcome.queued) : `${queued(outcome.queued)} No se enviaron: ${reasons.join(', ')}.`
  },
  invalid: 'La selección no es válida. Recarga la página e intenta de nuevo.',
  empty: 'Marca al menos una clienta.',
  tooMany: (max: number) => `Puedes enviar a ${max} clientas por vez.`,
  notAllowed: 'Solo la administradora puede enviar recordatorios.',
  failed: 'No se pudieron poner en cola los recordatorios. Intenta de nuevo.',
}
