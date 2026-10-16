import { ok, err, type Result } from '@/shared/result'
import { weeklyBlockInvalid, type WeeklyBlockInvalid } from './availability-errors'

// Bloque semanal de disponibilidad (US-AGE-01, criterio 1). Horas de pared recurrentes en la
// zona del estudio, en minutos desde la medianoche; weekday ISO 8601 (1 = lunes … 7 = domingo).
export interface WeeklyBlock {
  readonly id: string
  readonly resourceId: string
  readonly weekday: number
  readonly startMin: number
  readonly endMin: number
}

export const MINUTES_PER_DAY = 1440

const isWholeIn = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max

export function createWeeklyBlock(input: WeeklyBlock): Result<WeeklyBlock, WeeklyBlockInvalid> {
  const problems: string[] = []

  if (!isWholeIn(input.weekday, 1, 7)) problems.push('el día de la semana debe estar entre 1 y 7')
  if (!isWholeIn(input.startMin, 0, MINUTES_PER_DAY - 1)) problems.push('la hora de inicio no es válida')
  if (!isWholeIn(input.endMin, 1, MINUTES_PER_DAY)) problems.push('la hora de fin no es válida')
  if (problems.length === 0 && input.startMin >= input.endMin) {
    problems.push('la hora de inicio debe ser anterior a la de fin')
  }

  if (problems.length > 0) return err(weeklyBlockInvalid(problems))
  return ok({ ...input })
}

// Rangos semiabiertos [inicio, fin): un bloque que termina a las 12:00 y otro que empieza a las
// 12:00 son contiguos, no se solapan. Coincide con int4range(start_min, end_min) en la base.
export const weeklyBlocksOverlap = (a: WeeklyBlock, b: WeeklyBlock): boolean =>
  a.resourceId === b.resourceId &&
  a.weekday === b.weekday &&
  a.startMin < b.endMin &&
  b.startMin < a.endMin

export const findOverlappingBlock = (
  candidate: WeeklyBlock,
  existing: readonly WeeklyBlock[],
): WeeklyBlock | undefined => existing.find((block) => weeklyBlocksOverlap(candidate, block))

export const sortWeeklyBlocks = (blocks: readonly WeeklyBlock[]): WeeklyBlock[] =>
  [...blocks].sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin)
