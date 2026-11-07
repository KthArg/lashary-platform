import { getAuthSession, AUTH_ROLES } from '@/features/auth'
import { applyDiscount, listActivePromotions, listPackages, listTechniques } from '@/features/catalog'
import { bestActiveDiscountsByPackage, bestActiveDiscountsByTechnique } from './package-promotions'
import { MAX_SELECTION_PAGE_SERVICES } from './constants'

export type SelectableTechniqueOption = {
  id: string
  name: string
  discountPercent: number | null
}

export type PackageSelectorItem = {
  id: string
  name: string
  durationTotalMin: number
  techniqueNames: string[]
  price: number
  discountPercent: number | null
  priceDiscounted: number | null
}

export type TechniqueSelectionPageData =
  | { status: 'forbidden' }
  | { status: 'ok'; techniques: SelectableTechniqueOption[]; packages: PackageSelectorItem[] }

export async function loadTechniqueSelectionPageData(): Promise<TechniqueSelectionPageData> {
  const session = await getAuthSession()
  if (!session?.user || session.role !== AUTH_ROLES.CLIENTE) {
    return { status: 'forbidden' }
  }

  const [{ items: techniques }, { items: packages }, { items: activePromotions }] = await Promise.all([
    listTechniques({ activeOnly: true, pageSize: MAX_SELECTION_PAGE_SERVICES }),
    listPackages({ activeOnly: true, pageSize: MAX_SELECTION_PAGE_SERVICES }),
    listActivePromotions({ pageSize: MAX_SELECTION_PAGE_SERVICES }),
  ])

  const techniqueNameById = new Map(techniques.map((technique) => [technique.id, technique.name]))
  const discountByPackageId = bestActiveDiscountsByPackage(activePromotions)
  const discountByTechniqueId = bestActiveDiscountsByTechnique(activePromotions)

  return {
    status: 'ok',
    techniques: techniques.map((technique) => ({
      id: technique.id,
      name: technique.name,
      discountPercent: discountByTechniqueId.get(technique.id) ?? null,
    })),
    packages: packages.map((servicePackage) => {
      const discountPercent = discountByPackageId.get(servicePackage.id) ?? null
      return {
        id: servicePackage.id,
        name: servicePackage.name,
        durationTotalMin: servicePackage.durationTotalMin,
        techniqueNames: servicePackage.techniqueIds.flatMap((techniqueId) => {
          const name = techniqueNameById.get(techniqueId)
          return name === undefined ? [] : [name]
        }),
        price: servicePackage.price,
        discountPercent,
        priceDiscounted:
          discountPercent !== null ? applyDiscount(servicePackage.price, discountPercent) : null,
      }
    }),
  }
}
