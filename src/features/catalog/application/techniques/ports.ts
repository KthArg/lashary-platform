import type { Result } from '@/shared/result'
import type { Technique, ServiceFamily } from '../../domain/techniques/technique'
import type { TechniqueNameConflict } from '../../domain/techniques/errors'

export type ListTechniquesQuery = {
  activeOnly?: boolean
  page?: number
  pageSize?: number
}

export type TechniqueWriteModel = {
  name: string
  family: ServiceFamily
  priceFirstTime: number
  priceRetouch?: number | null
  durationFirstTimeMin: number
  durationRetouchMin?: number | null
  bufferMin: number
  reapplicationIntervalDays?: number | null
  deposit: number
  aftercareText: string
}

export type DeactivateCascadeResult = {
  deactivatedPackageIds: string[]
}

export type AffectedPackagesRace = {
  readonly code: 'CATALOG_TECHNIQUE_AFFECTED_PACKAGES_RACE'
}

export interface TechniqueRepository {
  list(params: {
    activeOnly: boolean
    offset: number
    limit: number
  }): Promise<{ items: Technique[]; total: number }>

  findById(id: string): Promise<Technique | null>

  findByIds(ids: string[]): Promise<Technique[]>

  save(technique: Technique): Promise<Result<void, TechniqueNameConflict>>

  deactivateCascade(
    id: string,
    expectedPackageIds: string[],
  ): Promise<Result<DeactivateCascadeResult, AffectedPackagesRace>>
}
