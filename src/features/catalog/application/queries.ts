import { ok, err, type Result } from '@/shared/result'
import type { TechniqueView } from '../domain/technique'
import type { PackageView } from '../domain/package'
import { TechniqueNotFound, PackageNotFound } from '../domain/errors'
import type {
  ListTechniquesQuery,
  ListPackagesQuery,
  Page,
  TechniqueRepository,
  PackageRepository,
  PackageWithDuration,
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

// DTO que expone la duración total (criterio 2) junto al resto de PackageView.
export type PackageListItem = PackageView & { durationTotalMin: number }

const toPackageListItem = (row: PackageWithDuration): PackageListItem => ({
  ...row.pkg.toView(),
  durationTotalMin: row.durationTotalMin,
})

export const listPackages =
  (repo: PackageRepository) =>
  async (query: ListPackagesQuery = {}): Promise<Page<PackageListItem>> => {
    const page = clampPage(query.page)
    const pageSize = clampPageSize(query.pageSize)
    const activeOnly = query.activeOnly ?? true

    const { items, total } = await repo.list({
      activeOnly,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    })

    return {
      items: items.map(toPackageListItem),
      page,
      pageSize,
      total,
    }
  }

export const getPackage =
  (repo: PackageRepository) =>
  async (id: string): Promise<Result<PackageListItem, PackageNotFound>> => {
    const row = await repo.findById(id)
    if (row === null) return err(new PackageNotFound(id))
    return ok(toPackageListItem(row))
  }
