// Result — resultado explícito de una operación (DOM-006).
// Los resultados de negocio ESPERADOS (no encontrado, monto inválido, espacio ocupado) se
// retornan como valor, no se lanzan. Lo verdaderamente inesperado sí lanza.

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value })

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error })

export const isOk = <T, E>(
  result: Result<T, E>,
): result is { ok: true; value: T } => result.ok

export const isErr = <T, E>(
  result: Result<T, E>,
): result is { ok: false; error: E } => !result.ok
