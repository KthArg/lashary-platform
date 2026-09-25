---
feature: payments
dri: pendiente
estado: en_progreso
actualizado: 2026-09-24
historias:
  - id: US-AGE-13
    estado: en_progreso
    falta: "criterios 2, 3 y 4, y la parte 'por paquete' del criterio 1, dependen de tablas que todavia no existen (citas de US-AGE-05, cierre/ledger de US-AGE-12, paquetes de US-PROD-01) y quedan diferidos hasta que esas historias existan (mismo patron que AGE-05/AGE-11/CLI-06); el criterio 1 'por tecnica' ya lo satisface catalog_techniques.deposit (US-AGE-08); del criterio 5 (exonerar + bitacora) el esquema payments_deposit_exemptions y su RLS existen, falta dominio/aplicacion/UI para otorgar la exoneracion de verdad"
flags: []
deuda: []
defectos: []
---

# payments

Anticipos, y la infraestructura de pagos sin historia propia (ADR-0007): el ledger append-only (DOM-005) nace con US-AGE-12/US-MOR-01, el registro de pago con comprobante con US-MOR-03/US-SHOP-02, y el export tabular con US-MOR-04. Esta feature es duena de las tablas y el value object; esas historias la construyen. Sin pasarela jamas.

## Qué hace hoy

Migración `supabase/migrations/20260924000000_payments_deposit_exemptions.sql`: tabla `payments_deposit_exemptions` (prefijo `payments_`, ARCH-006) — `client_id` (FK real a `clients_profiles`: a diferencia de `audit_events`, esta relación es homogénea y permanente, siempre apunta al mismo tipo de recurso), `exempted_by` (FK a `auth.users`, quién la otorgó), `reason`, `active` (por defecto `true`; la columna existe para cuando "levantar" una exoneración tenga su propia historia — hoy sin política de `UPDATE` para nadie), `created_at`/`updated_at` UTC (DOM-003). Índice único parcial `(client_id) WHERE active` — un cliente no puede tener dos exoneraciones vigentes a la vez, e indexa la FK (PERF-003) de paso. Índice en `exempted_by`.

RLS (SEC-001): `SELECT` e `INSERT` solo para staff (`public.auth_is_staff()`); sin políticas de `UPDATE` ni `DELETE` para nadie — "levantar" no es parte del criterio 5 de esta historia, se agrega cuando una historia futura lo exija.

Pruebas: `supabase/tests/database/payments_staff_access.test.sql` (pgTAP, control positivo: staff lee/inserta, nadie puede `UPDATE`/`DELETE`); `src/features/payments/__tests__/rls-isolation.test.ts` (SEC-002, control negativo: anon y una clienta autenticada real no leen ni escriben).

Capa `domain/`: entidad `DepositExemption` con constructor validado (`DepositExemption.create` → `Result`), invariantes DOM-007 (cliente, quién exonera y razón no vacíos); nace siempre `active: true`. Error `DepositExemptionValidationError` (DOM-006). Reloj inyectado (DOM-004). Pruebas con fixtures de `shared/testing/fixed-clock.ts`.

Capa `application/`: puerto `DepositExemptionRepository` (`save`, lanza `ClientAlreadyExempt` ante la unicidad parcial de la base — mismo patrón que `TechniqueNameConflict` en catalog) y puerto `RecordAuditEvent` (hacia `audit.record()`, inyectado — `application/` no importa la feature `audit`, eso lo cablea `index.ts`). Use-case `exemptClient(deps)(input)` (`exempt-client.ts`): valida, guarda, y solo si guardó registra el evento en la bitácora (`payments.deposit_exemption.granted`); si el registro falla después de guardar, el error se propaga en vez de tragarse — nunca finge éxito silencioso. Pruebas con repositorio en memoria y `recordAuditEvent` falso (`__tests__/exempt-client.test.ts`).

## Qué no hace todavía

Sin capa `db/`, `index.ts` ni UI — el use-case `exemptClient()` existe pero nadie puede invocarlo desde una ruta todavía. Próximo incremento de US-AGE-13.

## Contrato público

Sin contrato todavía. Al crearse, entra por `index.ts` (ARCH-003).
