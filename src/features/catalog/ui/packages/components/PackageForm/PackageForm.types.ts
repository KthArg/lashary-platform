import type { TechniqueView } from '../../../../domain/technique'
import type { PackageListItem } from '../../../../application/packages/queries'

export interface PackageFormProps {
  pkg?: PackageListItem
  techniques: TechniqueView[]
}
