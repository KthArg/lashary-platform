import { ok, err, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { studioDateOf } from '@/shared/studio-time'
import { createClosedDate, type ClosedDate } from '../domain/closed-dates'
import {
  availabilityEntryNotFound,
  type AvailabilityEntryNotFound,
  type ClosedDateAlreadyExists,
  type ClosedDateInvalid,
} from '../domain/availability-errors'
import { MAX_CLOSED_DATES, type ClosedDateRepository } from './availability-ports'

export type ClosedDatesDeps = {
  repo: ClosedDateRepository
  newId: () => string
  clock: Clock
}

export type AddClosedDateInput = {
  resourceId: string
  date: string
  kind: string
  label?: string | null
}

// Los días cerrados que ya pasaron no le sirven al panel; se listan desde hoy (fecha del estudio).
export const listUpcomingClosedDates =
  (deps: Pick<ClosedDatesDeps, 'repo' | 'clock'>) =>
  async (resourceId: string): Promise<ClosedDate[]> =>
    deps.repo.listFrom(resourceId, studioDateOf(deps.clock()), MAX_CLOSED_DATES)

// Criterio 2: definir un día no laborable o un feriado.
export const addClosedDate =
  (deps: Pick<ClosedDatesDeps, 'repo' | 'newId'>) =>
  async (
    input: AddClosedDateInput,
  ): Promise<Result<ClosedDate, ClosedDateInvalid | ClosedDateAlreadyExists>> => {
    const built = createClosedDate({ id: deps.newId(), ...input })
    if (isErr(built)) return built

    const saved = await deps.repo.insert(built.value)
    if (isErr(saved)) return saved

    return ok(built.value)
  }

export const removeClosedDate =
  (deps: Pick<ClosedDatesDeps, 'repo'>) =>
  async (id: string): Promise<Result<void, AvailabilityEntryNotFound>> =>
    (await deps.repo.remove(id)) ? ok(undefined) : err(availabilityEntryNotFound(id))
