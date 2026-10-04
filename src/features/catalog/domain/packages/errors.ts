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
