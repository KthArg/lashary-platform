import type { TechniqueView } from '@/features/catalog/domain/techniques/technique'
import type { PackageListItem } from '@/features/catalog/application/packages/queries'
import type { PromotionView } from '@/features/catalog/domain/promotions/promotion'

export interface PromotionFormProps {
  promotion?: PromotionView
  techniques: TechniqueView[]
  packages: PackageListItem[]
}
