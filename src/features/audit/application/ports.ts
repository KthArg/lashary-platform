import type { AuditEvent } from '../domain/audit-event'

// Puerto de persistencia. La implementación Supabase vive en db/ (ARCH: application orquesta
// domain + puertos; db/ consulta la tabla de la feature). Solo inserta: la bitácora es
// append-only y todavía nadie necesita consultarla desde código (se agrega cuando una historia
// futura lo exija, no antes).
export interface AuditEventRepository {
  insert(event: AuditEvent): Promise<void>
}
