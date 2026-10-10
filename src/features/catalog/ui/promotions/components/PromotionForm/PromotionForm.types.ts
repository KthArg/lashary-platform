import type { TechniqueView } from '../../../../domain/techniques/technique'
import type { PackageListItem } from '../../../../application/packages/queries'
import type { PromotionView } from '../../../../domain/promotions/promotion'

export interface PromotionFormProps {
  promotion?: PromotionView
  techniques: TechniqueView[]
  packages: PackageListItem[]
}
