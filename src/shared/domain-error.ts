// DomainError — raíz de todos los errores de dominio (DOM-006).
// Cada feature define sus subtipos con un `code` estable; el mapeo a HTTP status ocurre en
// un solo lugar, en el borde. Nada de dominio lanza strings ni errores pelados.

export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}
