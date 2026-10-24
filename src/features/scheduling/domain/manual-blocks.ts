import { ok, err, type Result } from '@/shared/result'
import { manualBlockInvalid, type ManualBlockInvalid } from './availability-errors'
import { MAX_MANUAL_BLOCK_REASON_LENGTH } from './manual-blocks.constants'

// Bloqueo manual puntual de un espacio (US-AGE-01, criterio 3). Instantes en UTC (DOM-003);
// la conversión desde la hora del estudio ocurre en el borde.
export interface ManualBlock {
  readonly id: string
  readonly resourceId: string
  readonly startsAt: Date
  readonly endsAt: Date
  readonly reason: string | null
}

export type ManualBlockInput = Omit<ManualBlock, 'reason'> & { reason?: string | null }

const isValidInstant = (value: Date): boolean => !Number.isNaN(value.getTime())

export function createManualBlock(input: ManualBlockInput): Result<ManualBlock, ManualBlockInvalid> {
  const problems: string[] = []
  if (!isValidInstant(input.startsAt)) problems.push('el inicio no es válido')
  if (!isValidInstant(input.endsAt)) problems.push('el fin no es válido')
  if (problems.length === 0 && input.startsAt.getTime() >= input.endsAt.getTime()) {
    problems.push('el inicio debe ser anterior al fin')
  }
  const reason = input.reason?.trim() || null
  if (reason !== null && reason.length > MAX_MANUAL_BLOCK_REASON_LENGTH) {
    problems.push(`el motivo supera los ${MAX_MANUAL_BLOCK_REASON_LENGTH} caracteres`)
  }
  if (problems.length > 0) return err(manualBlockInvalid(problems))

  return ok({
    id: input.id,
    resourceId: input.resourceId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    reason,
  })
}
