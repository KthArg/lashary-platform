import { ok, err, isErr, type Result } from '@/shared/result'
import { shortenedEndMs } from '../domain/manual-block-release'
import {
  availabilityEntryNotFound,
  manualBlockInvalid,
  type AvailabilityEntryNotFound,
  type ManualBlockInvalid,
} from '../domain/availability-errors'
import type { ManualBlockRepository } from './availability-ports'

export type ReleaseManualBlockInput = {
  id: string
  steps: number
  // El fin que la administradora vio al elegir cuánto liberar: si el bloqueo cambió desde
  // entonces, los espacios a liberar ya no significan lo mismo y no se aplica nada.
  expectedEndsAt: Date
}

export type ReleasedManualBlock = { id: string; endsAtMs: number }

export const releaseManualBlockTail =
  (deps: { repo: Pick<ManualBlockRepository, 'findById' | 'shorten'> }) =>
  async (
    input: ReleaseManualBlockInput,
  ): Promise<Result<ReleasedManualBlock, ManualBlockInvalid | AvailabilityEntryNotFound>> => {
    const block = await deps.repo.findById(input.id)
    if (!block) return err(availabilityEntryNotFound(input.id))
    if (Number.isNaN(input.expectedEndsAt.getTime()) || block.endsAt.getTime() !== input.expectedEndsAt.getTime()) {
      return err(manualBlockInvalid(['el bloqueo cambió desde que se abrió el panel']))
    }

    const newEndsAtMs = shortenedEndMs(block, input.steps)
    if (isErr(newEndsAtMs)) return newEndsAtMs

    if (!(await deps.repo.shorten(block.id, newEndsAtMs.value))) return err(availabilityEntryNotFound(block.id))
    return ok({ id: block.id, endsAtMs: newEndsAtMs.value })
  }
