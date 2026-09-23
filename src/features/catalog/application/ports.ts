import type { Technique, ServiceFamily } from '../domain/technique'
import type { Package } from '../domain/package'

export type Page<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

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

  // Batch por ids (PERF-005): createPackage/updatePackage validan varias técnicas a la vez y
  // no pueden hacerlo con N llamadas a findById en un loop.
  findByIds(ids: string[]): Promise<Technique[]>

  save(technique: Technique): Promise<void>
}

export type ListPackagesQuery = {
  activeOnly?: boolean
  page?: number
  pageSize?: number
}

// Datos de un paquete tal como llegan del borde (ya validados de formato por Zod, DOM-007).
export type PackageWriteModel = {
  name: string
  techniqueIds: string[]
  price: number
}

// Un paquete no congela la duración de sus técnicas (no es un snapshot, DOM-002 no aplica
// todavía): la duración total se calcula uniendo las técnicas miembro en la misma query que
// lee el paquete (PERF-005, sin queries en loop), no vive en el dominio Package.
export type PackageWithDuration = {
  pkg: Package
  durationTotalMin: number
}

export interface PackageRepository {
  list(params: {
    activeOnly: boolean
    offset: number
    limit: number
  }): Promise<{ items: PackageWithDuration[]; total: number }>

  findById(id: string): Promise<PackageWithDuration | null>

  save(pkg: Package): Promise<void>
}
