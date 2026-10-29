import { isOk } from '@/shared/result'
import { selectTechnique, type SelectableTechnique } from './technique-selection'

export type NamedTechnique = SelectableTechnique & { readonly name: string }

export interface ServiceOption {
  readonly key: string
  readonly techniqueId: string
  readonly name: string
  readonly isFirstTime: boolean
  readonly durationMin: number
}

const RETOUCH_SUFFIX = '.retoque'

export const serviceOptionKey = (techniqueId: string, isFirstTime: boolean): string =>
  isFirstTime ? techniqueId : `${techniqueId}${RETOUCH_SUFFIX}`

export const serviceOptionsOf = (techniques: readonly NamedTechnique[]): ServiceOption[] =>
  techniques.flatMap((technique) =>
    [true, false].flatMap((isFirstTime) => {
      const selection = selectTechnique(technique, isFirstTime)
      if (!isOk(selection)) return []
      return [
        {
          key: serviceOptionKey(technique.id, isFirstTime),
          techniqueId: technique.id,
          name: technique.name,
          isFirstTime,
          durationMin: selection.value.totalDurationMin,
        },
      ]
    }),
  )

export const findServiceOption = (
  options: readonly ServiceOption[],
  key: string | undefined,
): ServiceOption | undefined => (key === undefined ? undefined : options.find((option) => option.key === key))
