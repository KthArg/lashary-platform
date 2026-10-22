import { ok, err, type Result } from '@/shared/result'
import { manualBlockInvalid, type ManualBlockInvalid } from './availability-errors'
import { SLOT_INTERVAL_MIN } from './day-slots'
import type { ManualBlock } from './manual-blocks'
import { MS_PER_MINUTE } from './appointment-window.constants'

// Liberar el final de un bloqueo (US-AGE-07, criterio 3): de a espacios de la misma duración que
// los del calendario. Nunca deja un bloqueo vacío; liberar todo es desbloquear. Devuelve
// milisegundos UTC, sin construir Date (DOM-004).
const MS_PER_RELEASE_STEP = SLOT_INTERVAL_MIN * MS_PER_MINUTE

export function maxReleaseSteps(block: Pick<ManualBlock, 'startsAt' | 'endsAt'>): number {
  const durationMs = block.endsAt.getTime() - block.startsAt.getTime()
  return Math.max(0, Math.ceil(durationMs / MS_PER_RELEASE_STEP) - 1)
}

export function shortenedEndMs(
  block: Pick<ManualBlock, 'startsAt' | 'endsAt'>,
  steps: number,
): Result<number, ManualBlockInvalid> {
  if (!Number.isInteger(steps) || steps < 1 || steps > maxReleaseSteps(block)) {
    return err(manualBlockInvalid(['la cantidad de espacios a liberar no es válida']))
  }
  return ok(block.endsAt.getTime() - steps * MS_PER_RELEASE_STEP)
}
