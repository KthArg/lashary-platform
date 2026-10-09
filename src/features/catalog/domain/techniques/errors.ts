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
