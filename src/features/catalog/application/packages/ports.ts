import type { Result } from '@/shared/result'
import type { Package } from '../../domain/packages/package'
import type { PackageNameConflict } from '../../domain/packages/errors'

export type ListPackagesQuery = {
  activeOnly?: boolean
  page?: number
  pageSize?: number
}

export type PackageWriteModel = {
  name: string
  techniqueIds: string[]
  price: number
  deposit?: number
}

export type PackageWithDuration = {
  pkg: Package
  durationTotalMin: number
}

export type PackageSummary = {
  id: string
  name: string
}

export interface PackageRepository {
  list(params: {
    activeOnly: boolean
    offset: number
    limit: number
  }): Promise<{ items: PackageWithDuration[]; total: number }>

  findById(id: string): Promise<PackageWithDuration | null>

  findActiveByTechniqueId(techniqueId: string): Promise<PackageSummary[]>

  save(pkg: Package): Promise<Result<void, PackageNameConflict>>

  delete(id: string): Promise<void>
}
