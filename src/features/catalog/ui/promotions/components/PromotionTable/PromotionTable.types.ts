import type { PromotionListItem } from '../../../../application/promotions/queries'

export interface PromotionTableProps {
  items: PromotionListItem[]
  techniqueNameById: Map<string, string>
  packageNameById: Map<string, string>
}
