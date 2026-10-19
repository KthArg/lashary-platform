export const TECHNIQUE_ERROR_CODES = {
  invalid: 'CATALOG_TECHNIQUE_INVALID',
  notFound: 'CATALOG_TECHNIQUE_NOT_FOUND',
  nameConflict: 'CATALOG_TECHNIQUE_NAME_CONFLICT',
} as const

type TechniqueErrorCode = (typeof TECHNIQUE_ERROR_CODES)[keyof typeof TECHNIQUE_ERROR_CODES]

function hasCode<T extends { code: TechniqueErrorCode }>(
  error: unknown,
  code: T['code'],
): error is T {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code
}

export interface TechniqueValidationError {
  readonly code: typeof TECHNIQUE_ERROR_CODES.invalid
  readonly message: string
  readonly problems: string[]
}

export function techniqueValidationError(problems: string[]): TechniqueValidationError {
  return {
    code: TECHNIQUE_ERROR_CODES.invalid,
    message: `técnica inválida: ${problems.join('; ')}`,
    problems,
  }
}

export const isTechniqueValidationError = (error: unknown): error is TechniqueValidationError =>
  hasCode<TechniqueValidationError>(error, TECHNIQUE_ERROR_CODES.invalid)

export interface TechniqueNotFound {
  readonly code: typeof TECHNIQUE_ERROR_CODES.notFound
  readonly message: string
  readonly techniqueId: string
}

export function techniqueNotFound(techniqueId: string): TechniqueNotFound {
  return {
    code: TECHNIQUE_ERROR_CODES.notFound,
    message: `no existe la técnica ${techniqueId}`,
    techniqueId,
  }
}

export const isTechniqueNotFound = (error: unknown): error is TechniqueNotFound =>
  hasCode<TechniqueNotFound>(error, TECHNIQUE_ERROR_CODES.notFound)

export interface TechniqueNameConflict {
  readonly code: typeof TECHNIQUE_ERROR_CODES.nameConflict
  readonly message: string
  readonly name: string
}

export function techniqueNameConflict(name: string): TechniqueNameConflict {
  return {
    code: TECHNIQUE_ERROR_CODES.nameConflict,
    message: `ya existe una técnica llamada "${name}"`,
    name,
  }
}

export const isTechniqueNameConflict = (error: unknown): error is TechniqueNameConflict =>
  hasCode<TechniqueNameConflict>(error, TECHNIQUE_ERROR_CODES.nameConflict)
