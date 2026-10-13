import type { TechniqueView } from '../../../../domain/techniques/technique'
import type { PackageListItem } from '../../../../application/packages/queries'

export interface PackageFormProps {
  pkg?: PackageListItem
  techniques: TechniqueView[]
}
