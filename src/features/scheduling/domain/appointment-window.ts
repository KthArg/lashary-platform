import { err, ok, type Result } from '@/shared/result'
import { invalidAppointmentWindow, type InvalidAppointmentWindow } from './errors'
import { MS_PER_MINUTE } from './appointment-window.constants'

export type AppointmentWindowInput = {
  startsAtMs: number
  serviceDurationMin: number
  prepMin: number
  cleanupMin: number
}

// Los instantes son milisegundos desde la época (UTC, DOM-003): el dominio no construye `Date`
// (DOM-004). Convertir a ISO para la base, o a hora local para mostrar, es de la capa que llama.
export type AppointmentWindow = {
  readonly startsAtMs: number
  readonly endsAtMs: number
  readonly occupiedFromMs: number
  readonly occupiedUntilMs: number
}

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0
const isNonNegativeInteger = (value: number): boolean => Number.isInteger(value) && value >= 0

// El único lugar que calcula el rango ocupado (ADR-0002): [inicio - preparación, fin + limpieza).
// `startsAtMs`/`endsAtMs` son el servicio que ve la clienta; `occupiedFromMs`/`occupiedUntilMs` son lo que
// la agenda bloquea y lo que la base valida contra el exclusion constraint (DOM-010).
export function computeAppointmentWindow(
  input: AppointmentWindowInput,
): Result<AppointmentWindow, InvalidAppointmentWindow> {
  if (!Number.isSafeInteger(input.startsAtMs)) {
    return err(invalidAppointmentWindow('startsAtMs'))
  }
  if (!isPositiveInteger(input.serviceDurationMin)) {
    return err(invalidAppointmentWindow('serviceDurationMin'))
  }
  if (!isNonNegativeInteger(input.prepMin)) {
    return err(invalidAppointmentWindow('prepMin'))
  }
  if (!isNonNegativeInteger(input.cleanupMin)) {
    return err(invalidAppointmentWindow('cleanupMin'))
  }

  const endsAtMs = input.startsAtMs + input.serviceDurationMin * MS_PER_MINUTE

  return ok({
    startsAtMs: input.startsAtMs,
    endsAtMs,
    occupiedFromMs: input.startsAtMs - input.prepMin * MS_PER_MINUTE,
    occupiedUntilMs: endsAtMs + input.cleanupMin * MS_PER_MINUTE,
  })
}

// El catálogo guarda un solo `buffer_min` ("preparación + limpieza", catalog/SPEC.md) sin
// repartirlo. Mientras no exista esa separación, todo el buffer se cuenta después del servicio:
// es lo que ya asume selectTechnique al sumarlo a la duración. Si el catálogo llega a separar los
// dos tiempos, solo cambia este helper.
export function bufferAsCleanup(
  bufferMin: number,
): Pick<AppointmentWindowInput, 'prepMin' | 'cleanupMin'> {
  return { prepMin: 0, cleanupMin: bufferMin }
}
