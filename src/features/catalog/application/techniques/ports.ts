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

/** Señal de bajo nivel: la lista de paquetes afectados cambió entre el aviso y la confirmación.
 *  La capa de aplicación la traduce a TechniqueAffectedPackagesChanged con los nombres frescos. */
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

  /** Desactiva la técnica y, en la misma transacción, los paquetes activos que la incluían —
   *  solo si expectedPackageIds coincide con los paquetes activos reales en ese momento. */
  deactivateCascade(
    id: string,
    expectedPackageIds: string[],
  ): Promise<Result<DeactivateCascadeResult, AffectedPackagesRace>>
}
