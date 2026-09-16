import { DomainError } from '@/shared/domain-error'

// El CMS no respondió como dice el contrato: caído, timeout, estado no-200 o cuerpo sin `data`.
// Es un resultado esperado (ADR-0001 exige degradar), así que se retorna, no se lanza (DOM-006).
export class CmsUnavailable extends DomainError {
  readonly code = 'CMS_UNAVAILABLE'

  constructor(
    readonly key: string,
    readonly reason: string,
  ) {
    super(`CMS no disponible para '${key}': ${reason}`)
  }
}
