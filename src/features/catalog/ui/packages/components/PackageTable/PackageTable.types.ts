import type { PackageListItem } from '../../../../application/packages/queries'

export interface PackageTableProps {
  items: PackageListItem[]
  techniqueNameById: Map<string, string>
  inactiveTechniqueIds?: Set<string>
}
