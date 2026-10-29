import { getAuthSession, AUTH_ROLES } from '@/features/auth'
import { listPackages, listTechniques } from '@/features/catalog'
import { MAX_SELECTION_PAGE_SERVICES } from './constants'

export type SelectableTechniqueOption = {
  id: string
  name: string
}

export type SelectablePackageOption = {
  id: string
  name: string
  durationTotalMin: number
}

export type TechniqueSelectionPageData =
  | { status: 'forbidden' }
  | { status: 'ok'; techniques: SelectableTechniqueOption[]; packages: SelectablePackageOption[] }

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
    packages: packages.map((pkg) => ({ id: pkg.id, name: pkg.name, durationTotalMin: pkg.durationTotalMin })),
  }
}
