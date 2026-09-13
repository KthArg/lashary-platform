// catalog_admin_write — feature flag (INT-004).
// Dueño: Bayron Alpizar. Retiro: 2026-12-01 (o antes, al mergear auth con auth_is_staff()).
//
// La escritura del catálogo (crear / editar / desactivar técnicas) está APAGADA: la política
// RLS de escritura no existe todavía (B1, fail-closed) porque auth aún no expone
// public.auth_is_staff(). Con el flag en false, los server actions no intentan escribir y
// devuelven un mensaje claro en vez de chocar contra un 401 de RLS.
//
// Al encender: crear las políticas INSERT/UPDATE/DELETE con WITH CHECK (public.auth_is_staff())
// en una migración forward, poner esto en true, y borrar este archivo.
export const CATALOG_ADMIN_WRITE = false
