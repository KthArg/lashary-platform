import { getAuthSession, AUTH_ROLES } from '@/features/auth'
import { listTechniques } from '@/features/catalog'

export type SelectableTechniqueOption = {
  id: string
  name: string
}

export type TechniqueSelectionPageData =
  | { status: 'forbidden' }
  | { status: 'ok'; techniques: SelectableTechniqueOption[] }

export async function loadTechniqueSelectionPageData(): Promise<TechniqueSelectionPageData> {
  const session = await getAuthSession()
  if (!session?.user || session.role !== AUTH_ROLES.CLIENTE) {
    return { status: 'forbidden' }
  }

  const { items } = await listTechniques({ activeOnly: true, pageSize: 100 })

  return {
    status: 'ok',
    techniques: items.map((technique) => ({ id: technique.id, name: technique.name })),
  }
}
