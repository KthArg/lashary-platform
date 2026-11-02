import { isOk } from '@/shared/result'
import { selectTechnique, type SelectableTechnique } from './technique-selection'

export type NamedTechnique = SelectableTechnique & { readonly name: string }

export type NamedPackage = {
  readonly id: string
  readonly name: string
  readonly isActive: boolean
  readonly durationTotalMin: number
}

export interface TechniqueServiceOption {
  readonly kind: 'technique'
  readonly key: string
  readonly techniqueId: string
  readonly name: string
  readonly isFirstTime: boolean
  readonly durationMin: number
}

export interface PackageServiceOption {
  readonly kind: 'package'
  readonly key: string
  readonly packageId: string
  readonly name: string
  readonly durationMin: number
}

export type ServiceOption = TechniqueServiceOption | PackageServiceOption

const RETOUCH_SUFFIX = '.retoque'
const PACKAGE_KEY_PREFIX = 'pkg:'

export const serviceOptionKey = (techniqueId: string, isFirstTime: boolean): string =>
  isFirstTime ? techniqueId : `${techniqueId}${RETOUCH_SUFFIX}`

export const packageOptionKey = (packageId: string): string => `${PACKAGE_KEY_PREFIX}${packageId}`

export const serviceOptionsOf = (techniques: readonly NamedTechnique[]): TechniqueServiceOption[] =>
  techniques.flatMap((technique) =>
    [true, false].flatMap((isFirstTime) => {
      const selection = selectTechnique(technique, isFirstTime)
      if (!isOk(selection)) return []
      return [
        {
          kind: 'technique' as const,
          key: serviceOptionKey(technique.id, isFirstTime),
          techniqueId: technique.id,
          name: technique.name,
          isFirstTime,
          durationMin: selection.value.totalDurationMin,
        },
      ]
    }),
  )

// durationTotalMin ya viene calculado por catalog (ARCH-005): sum(duration_first_time_min +
// buffer_min) de cada técnica incluida, la misma fórmula que usa scheduling_book_package_appointment
// al congelar la cita. Un paquete no tiene primera vez ni retoque (catalog-api.md).
export const packageServiceOptionsOf = (packages: readonly NamedPackage[]): PackageServiceOption[] =>
  packages
    .filter((pkg) => pkg.isActive)
    .map((pkg) => ({
      kind: 'package' as const,
      key: packageOptionKey(pkg.id),
      packageId: pkg.id,
      name: pkg.name,
      durationMin: pkg.durationTotalMin,
    }))

export const findServiceOption = (
  options: readonly ServiceOption[],
  key: string | undefined,
): ServiceOption | undefined => (key === undefined ? undefined : options.find((option) => option.key === key))
