import type { Technique, ServiceFamily } from '../../domain/techniques/technique'

export type ListTechniquesQuery = {
  activeOnly?: boolean
  page?: number
  pageSize?: number
}

// Datos de una técnica tal como llegan del borde (ya validados de formato por Zod, DOM-007).
// Montos en colones enteros; los use-cases los envuelven en Money.
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

// Puerto de persistencia. La implementación Supabase vive en db/ (ARCH: application orquesta
// domain + puertos; db/ consulta las tablas de la feature).
export interface TechniqueRepository {
  list(params: {
    activeOnly: boolean
    offset: number
    limit: number
  }): Promise<{ items: Technique[]; total: number }>

  findById(id: string): Promise<Technique | null>

  findByIds(ids: string[]): Promise<Technique[]>

  save(technique: Technique): Promise<void>
}
