import { err, ok, type Result } from '@/shared/result'
import { techniqueNotSelectable, type TechniqueNotSelectable } from './errors'

export type SelectableTechnique = {
  id: string
  isActive: boolean
  durationFirstTimeMin: number
  durationRetouchMin: number | null
  bufferMin: number
}

export type TechniqueSelection = {
  readonly techniqueId: string
  readonly isFirstTime: boolean
  readonly totalDurationMin: number
}

export function selectTechnique(
  technique: SelectableTechnique,
  isFirstTime: boolean,
): Result<TechniqueSelection, TechniqueNotSelectable> {
  if (!technique.isActive) {
    return err(techniqueNotSelectable(technique.id, 'inactive'))
  }

  if (!isFirstTime && technique.durationRetouchMin === null) {
    return err(techniqueNotSelectable(technique.id, 'no_retouch'))
  }

  const baseDurationMin = isFirstTime
    ? technique.durationFirstTimeMin
    : (technique.durationRetouchMin as number)

  return ok({
    techniqueId: technique.id,
    isFirstTime,
    totalDurationMin: baseDurationMin + technique.bufferMin,
  })
}
