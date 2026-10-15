import { err, ok, type Result } from '@/shared/result'
import { invalidAppointmentWindow, type InvalidAppointmentWindow } from './errors'
import { MS_PER_MINUTE } from './appointment-window.constants'

export type AppointmentWindowInput = {
  startsAtMs: number
  serviceDurationMin: number
  prepMin: number
  cleanupMin: number
}

export type AppointmentWindow = {
  readonly startsAtMs: number
  readonly endsAtMs: number
  readonly occupiedFromMs: number
  readonly occupiedUntilMs: number
}

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0
const isNonNegativeInteger = (value: number): boolean => Number.isInteger(value) && value >= 0

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

export function bufferAsCleanup(
  bufferMin: number,
): Pick<AppointmentWindowInput, 'prepMin' | 'cleanupMin'> {
  return { prepMin: 0, cleanupMin: bufferMin }
}
