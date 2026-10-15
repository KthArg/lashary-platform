import { err, type Result } from '@/shared/result'
import { computeAppointmentWindow } from '../domain/appointment-window'
import type { InvalidAppointmentWindow, SpaceNotAvailable } from '../domain/errors'
import type { AppointmentRepository, CreatedAppointment } from './ports'

export type CreateAppointmentInput = {
  resourceId: string
  startsAtMs: number
  serviceDurationMin: number
  prepMin: number
  cleanupMin: number
}

export type CreateAppointmentError = InvalidAppointmentWindow | SpaceNotAvailable

// Calcula el rango ocupado en el dominio y lo entrega al repositorio. No hay "check-then-insert":
// la garantía de no-solape es el exclusion constraint de la base (DOM-010, ADR-0002), y este caso
// de uso solo traduce su rechazo en un resultado de negocio.
export async function createAppointment(
  appointments: AppointmentRepository,
  input: CreateAppointmentInput,
): Promise<Result<CreatedAppointment, CreateAppointmentError>> {
  const window = computeAppointmentWindow(input)
  if (!window.ok) return err(window.error)

  return appointments.create({
    resourceId: input.resourceId,
    startsAtMs: window.value.startsAtMs,
    endsAtMs: window.value.endsAtMs,
    occupiedFromMs: window.value.occupiedFromMs,
    occupiedUntilMs: window.value.occupiedUntilMs,
  })
}
