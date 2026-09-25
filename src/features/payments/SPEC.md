---
feature: payments
dri: pendiente
estado: en_progreso
actualizado: 2026-09-24
historias:
  - id: US-AGE-13
    estado: en_progreso
    falta: "criterios 2, 3 y 4, y la parte 'por paquete' del criterio 1, dependen de tablas que todavia no existen (citas de US-AGE-05, cierre/ledger de US-AGE-12, paquetes de US-PROD-01) y quedan diferidos hasta que esas historias existan (mismo patron que AGE-05/AGE-11/CLI-06 en DEPENDENCIES.md); el criterio 1 'por tecnica' ya lo satisface catalog_techniques.deposit (US-AGE-08); el criterio 5 (exonerar + bitacora) ya esta completo: ExemptClientForm en /admin/payments, exemptClientAction valida y llama a exemptClient(), que audita en audit.record()"
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

Capa `db/`: `SupabaseDepositExemptionRepository` (`toRow` mapea dominio → fila, exportada con test unitario propio; `save()` distingue `23505` (unique_violation, la constraint parcial de `client_id` activo) y lo convierte en `ClientAlreadyExempt` — cualquier otro error de Supabase sigue siendo una falla de infra genuina). Prueba de integración: `save()` con token anónimo denegado por RLS.

`index.ts` (ARCH-003): `exemptClient(input)` — cablea el repositorio de servidor, `randomUUID()`, `systemClock` **y `audit.record()` real**, importado del entry point de `audit` (único import cross-feature de toda la historia — `domain/` y `application/` de `payments` no conocen a `audit`, ARCH-004).

Capa `ui/`: `schema.ts` (Zod, DOM-007), `messages.ts` (texto externalizado, DOM-009), `action-state.ts`, `require-staff.ts` (mismo patrón que catalog). `actions.ts`: `exemptClientAction` (valida con Zod, resuelve `exemptedBy` de la sesión admin real vía `getAuthSession`, llama a `exemptClient` — importado del propio `index.ts` de `payments`, no re-cablea `deps` a mano) y `searchClientsAction` (envuelve `listClientsAction` de `clients`, por su entry point — ARCH-003; el selector de clienta reusa el buscador que ya existe, no inventa uno). `ExemptClientForm.tsx` (client component, DaisyUI/UI-001/002): busca clienta por nombre → selecciona de la lista → escribe la razón → envía. UI-003: la lista de resultados tiene estado vacío ("sin resultados") y de carga (botón "Buscando…" mientras `searchClientsAction` corre en una `useTransition`); UI-004: cada campo tiene `<label>` asociado, los resultados son `<button>` nativos (operables por teclado sin ARIA que finja un patrón de listbox que no se implementó), y el área de "sin resultados" es `aria-live="polite"`. Pruebas con `exemptClient`/`listClientsAction`/`getAuthSession` falsos (`__tests__/actions.test.ts`, `__tests__/schema.test.ts`) y una prueba de componente con `@testing-library/react` para el flujo buscar → seleccionar → enviar (`__tests__/ExemptClientForm.test.tsx`).

Ruta `src/app/admin/payments/`: `page.tsx` llama a `requireAdminSession()` (mensaje amable; RLS es la frontera real, SEC-001) y monta `ExemptClientForm`. Sin `loading.tsx`/`error.tsx` propios: a diferencia de `/admin/catalog`, esta página no hace una carga de datos bloqueante antes del primer render, así que no hay un estado de "cargando la página" que mostrar; si un incremento futuro agrega esa carga, entonces sí hace falta el `client.ts` que ese boundary exigiría (mismo motivo que documenta `catalog/ui/messages.ts`).

Con esto el **criterio 5 de US-AGE-13 queda completo**: la administradora puede exonerar el anticipo de una clienta específica desde `/admin/payments`, y la exoneración queda en la bitácora de auditoría.

## Qué no hace todavía

Nada de esta feature en concreto — lo que falta de US-AGE-13 son los criterios diferidos nombrados arriba (`falta:` de la historia), que dependen de tablas de otras historias.

## Contrato público (`index.ts`, ARCH-003)

- `exemptClient(input: ExemptClientInput): Promise<Result<DepositExemptionView, DepositExemptionValidationError | ClientAlreadyExempt>>` — otorga la exoneración y la registra en la bitácora. `input`: `{ clientId, exemptedBy, reason }`.
- Tipos: `ExemptClientInput`, `DepositExemptionView`.
- Errores: `DepositExemptionValidationError` (campos vacíos), `ClientAlreadyExempt` (el cliente ya tiene una exoneración vigente).
