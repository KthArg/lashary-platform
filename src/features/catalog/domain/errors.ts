import { DomainError } from '@/shared/domain-error'

// Errores de dominio de la feature catalog (DOM-006). El mapeo a HTTP status ocurre en el
// borde (server actions / route handlers), en un solo lugar.

export abstract class CatalogError extends DomainError {}

export class TechniqueValidationError extends CatalogError {
  readonly code = 'CATALOG_TECHNIQUE_INVALID'

  constructor(public readonly problems: string[]) {
    super(`técnica inválida: ${problems.join('; ')}`)
  }
}

export class TechniqueNotFound extends CatalogError {
  readonly code = 'CATALOG_TECHNIQUE_NOT_FOUND'

  constructor(public readonly techniqueId: string) {
    super(`no existe la técnica ${techniqueId}`)
  }
}

// DOM-006: la violación de catalog_techniques_name_unique es un caso de negocio esperable
// (dos técnicas no pueden compartir nombre), no una falla de infraestructura — se mapea a un
// subtipo en vez de relanzarse como Error genérico (db/technique-repository.ts).
export class TechniqueNameConflict extends CatalogError {
  readonly code = 'CATALOG_TECHNIQUE_NAME_CONFLICT'

  constructor(public readonly name: string) {
    super(`ya existe una técnica llamada "${name}"`)
  }
}

// Errores de Package: interfaces + funciones fábrica, sin `class` (en migración hacia ese
// estándar para código nuevo — ver src/features/catalog/SPEC.md). No extienden CatalogError:
// no hay ningún `instanceof DomainError` genérico en el repo que dependa de esa jerarquía.
export interface PackageValidationError {
  readonly code: 'CATALOG_PACKAGE_INVALID'
  readonly message: string
  readonly problems: string[]
}

export function packageValidationError(problems: string[]): PackageValidationError {
  return {
    code: 'CATALOG_PACKAGE_INVALID',
    message: `paquete inválido: ${problems.join('; ')}`,
    problems,
  }
}

export function isPackageValidationError(error: unknown): error is PackageValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'CATALOG_PACKAGE_INVALID'
  )
}

export interface PackageNotFound {
  readonly code: 'CATALOG_PACKAGE_NOT_FOUND'
  readonly message: string
  readonly packageId: string
}

export function packageNotFound(packageId: string): PackageNotFound {
  return {
    code: 'CATALOG_PACKAGE_NOT_FOUND',
    message: `no existe el paquete ${packageId}`,
    packageId,
  }
}

export function isPackageNotFound(error: unknown): error is PackageNotFound {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'CATALOG_PACKAGE_NOT_FOUND'
  )
}

// DOM-006: la violación de catalog_packages_name_unique es un caso de negocio esperable, igual
// que TechniqueNameConflict (db/package-repository.ts).
export interface PackageNameConflict {
  readonly code: 'CATALOG_PACKAGE_NAME_CONFLICT'
  readonly message: string
  readonly name: string
}

export function packageNameConflict(name: string): PackageNameConflict {
  return {
    code: 'CATALOG_PACKAGE_NAME_CONFLICT',
    message: `ya existe un paquete llamado "${name}"`,
    name,
  }
}

export function isPackageNameConflict(error: unknown): error is PackageNameConflict {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'CATALOG_PACKAGE_NAME_CONFLICT'
  )
}
