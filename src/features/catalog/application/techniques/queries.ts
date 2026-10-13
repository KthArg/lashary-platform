import { ok, err, type Result } from '@/shared/result'
import type { TechniqueView } from '../../domain/techniques/technique'
import { TechniqueNotFound } from '../../domain/techniques/errors'
import type { ListTechniquesQuery, TechniqueRepository } from './ports'
import { clampPage, clampPageSize, type Page } from '../pagination'

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
