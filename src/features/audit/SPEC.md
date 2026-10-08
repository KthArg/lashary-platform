---
feature: audit
dri: pendiente
estado: en_progreso
actualizado: 2026-09-23
historias:
  []
flags: []
deuda: []
defectos: []
---

# audit

Bitacora de auditoria append-only. Sin historia propia (ADR-0007): se construye con US-AGE-13 — primera historia que la exige — y la reusan US-AGE-06/12, US-CLI-04, US-MOR-02/04/05 y el rechazo de reservas de US-AGE-09.

## Qué hace hoy

Migración `supabase/migrations/20260923000000_audit_events.sql`: tabla `audit_events` (prefijo `audit_`, ARCH-006) — `actor_id` (FK a `auth.users`), `action` (texto libre, sin enum a propósito), `entity_type` + `entity_id` (sin FK, mismo principio que `catalog_techniques`: esta tabla la escriben features distintas y no debe acoplarse al esquema de ninguna), `payload` jsonb, `created_at` UTC (DOM-003). Índices en `(entity_type, entity_id)`, `actor_id` y `created_at` (PERF-003).

RLS (SEC-001): `SELECT` e `INSERT` solo para staff (`public.auth_is_staff()`); **sin políticas de `UPDATE` ni `DELETE`** — con RLS activo y ninguna política que las cubra, la base las deniega a cualquier rol, staff incluida. Append-only garantizado en la base, no solo en la aplicación.

Pruebas: `supabase/tests/database/audit_staff_access.test.sql` (pgTAP, control positivo: staff lee/inserta, nadie — ni staff — puede `UPDATE`/`DELETE`); `src/features/audit/__tests__/rls-isolation.test.ts` (SEC-002, control negativo: anon y una clienta autenticada real no leen ni escriben).

## Qué no hace todavía

Sin capa `domain/`, `application/`, `db/` ni `index.ts` — nadie puede escribir un evento desde código todavía, solo existe el esquema y su RLS. Próxima pieza de US-AGE-13.

## Contrato público

Sin contrato todavía. Al crearse, entra por `index.ts` (ARCH-003).
