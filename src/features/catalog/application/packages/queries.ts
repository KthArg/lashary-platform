import { ok, err, type Result } from '@/shared/result'
import { packageToView, type PackageView } from '../../domain/packages/package'
import { packageNotFound, type PackageNotFound } from '../../domain/packages/errors'
import { techniqueToView, type TechniqueView } from '../../domain/techniques/technique'
import type { TechniqueRepository } from '../techniques/ports'
import { clampPage, clampPageSize, type Page } from '../pagination'
import type { ListPackagesQuery, PackageRepository, PackageWithDuration } from './ports'

export type PackageListItem = PackageView & { durationTotalMin: number }

const toPackageListItem = (row: PackageWithDuration): PackageListItem => ({
  ...packageToView(row.pkg),
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
    if (row === null) return err(packageNotFound(id))
    return ok(toPackageListItem(row))
  }

export const listPackageTechniques =
  (repo: TechniqueRepository) =>
  async (packages: readonly Pick<PackageView, 'techniqueIds'>[]): Promise<TechniqueView[]> => {
    const ids = Array.from(new Set(packages.flatMap((pkg) => pkg.techniqueIds)))
    const techniques = await repo.findByIds(ids)
    return techniques.map(techniqueToView)
  }
