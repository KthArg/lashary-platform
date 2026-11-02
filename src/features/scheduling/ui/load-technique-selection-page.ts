import { getAuthSession, AUTH_ROLES } from '@/features/auth'
import { listPackages, listTechniques } from '@/features/catalog'
import type { NamedPackage } from '../domain/service-option'
import { MAX_SELECTION_PAGE_SERVICES } from './constants'

export type SelectableTechniqueOption = {
  id: string
  name: string
}

export type TechniqueSelectionPageData =
  | { status: 'forbidden' }
  | { status: 'ok'; techniques: SelectableTechniqueOption[]; packages: NamedPackage[] }

export async function loadTechniqueSelectionPageData(): Promise<TechniqueSelectionPageData> {
  const session = await getAuthSession()
  if (!session?.user || session.role !== AUTH_ROLES.CLIENTE) {
    return { status: 'forbidden' }
  }

  const [{ items: techniques }, { items: packages }] = await Promise.all([
    listTechniques({ activeOnly: true, pageSize: MAX_SELECTION_PAGE_SERVICES }),
    listPackages({ activeOnly: true, pageSize: MAX_SELECTION_PAGE_SERVICES }),
  ])

  return {
    status: 'ok',
    techniques: techniques.map((technique) => ({ id: technique.id, name: technique.name })),
    packages: packages.map((servicePackage) => ({
      id: servicePackage.id,
      name: servicePackage.name,
      isActive: servicePackage.isActive,
      durationTotalMin: servicePackage.durationTotalMin,
    })),
  }
}
