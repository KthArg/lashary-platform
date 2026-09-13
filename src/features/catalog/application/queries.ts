import { ok, err, type Result } from '@/shared/result'
import type { TechniqueView } from '../domain/technique'
import { TechniqueNotFound } from '../domain/errors'
import type {
  ListTechniquesQuery,
  Page,
  TechniqueRepository,
} from './ports'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

const clampPage = (value: number | undefined): number =>
  Math.max(1, Math.trunc(value ?? 1) || 1)

const clampPageSize = (value: number | undefined): number =>
  Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(value ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE))

export const listTechniques =
  (repo: TechniqueRepository) =>
  async (query: ListTechniquesQuery = {}): Promise<Page<TechniqueView>> => {
    const page = clampPage(query.page)
    const pageSize = clampPageSize(query.pageSize)
    const activeOnly = query.activeOnly ?? true

    const { items, total } = await repo.list({
      activeOnly,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    })

    return {
      items: items.map((technique) => technique.toView()),
      page,
      pageSize,
      total,
    }
  }

export const getTechnique =
  (repo: TechniqueRepository) =>
  async (id: string): Promise<Result<TechniqueView, TechniqueNotFound>> => {
    const technique = await repo.findById(id)
    if (technique === null) return err(new TechniqueNotFound(id))
    return ok(technique.toView())
  }
