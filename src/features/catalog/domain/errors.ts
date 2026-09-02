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
