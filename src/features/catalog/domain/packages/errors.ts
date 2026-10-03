export const PACKAGE_ERROR_CODES = {
  invalid: 'CATALOG_PACKAGE_INVALID',
  notFound: 'CATALOG_PACKAGE_NOT_FOUND',
  nameConflict: 'CATALOG_PACKAGE_NAME_CONFLICT',
} as const

type PackageErrorCode = (typeof PACKAGE_ERROR_CODES)[keyof typeof PACKAGE_ERROR_CODES]

function hasCode<T extends { code: PackageErrorCode }>(
  error: unknown,
  code: T['code'],
): error is T {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code
}

export interface PackageValidationError {
  readonly code: typeof PACKAGE_ERROR_CODES.invalid
  readonly message: string
  readonly problems: string[]
}

export function packageValidationError(problems: string[]): PackageValidationError {
  return {
    code: PACKAGE_ERROR_CODES.invalid,
    message: `paquete inválido: ${problems.join('; ')}`,
    problems,
  }
}

export const isPackageValidationError = (error: unknown): error is PackageValidationError =>
  hasCode<PackageValidationError>(error, PACKAGE_ERROR_CODES.invalid)

export interface PackageNotFound {
  readonly code: typeof PACKAGE_ERROR_CODES.notFound
  readonly message: string
  readonly packageId: string
}

export function packageNotFound(packageId: string): PackageNotFound {
  return {
    code: PACKAGE_ERROR_CODES.notFound,
    message: `no existe el paquete ${packageId}`,
    packageId,
  }
}

export const isPackageNotFound = (error: unknown): error is PackageNotFound =>
  hasCode<PackageNotFound>(error, PACKAGE_ERROR_CODES.notFound)

export interface PackageNameConflict {
  readonly code: typeof PACKAGE_ERROR_CODES.nameConflict
  readonly message: string
  readonly name: string
}

export function packageNameConflict(name: string): PackageNameConflict {
  return {
    code: PACKAGE_ERROR_CODES.nameConflict,
    message: `ya existe un paquete llamado "${name}"`,
    name,
  }
}

export const isPackageNameConflict = (error: unknown): error is PackageNameConflict =>
  hasCode<PackageNameConflict>(error, PACKAGE_ERROR_CODES.nameConflict)
