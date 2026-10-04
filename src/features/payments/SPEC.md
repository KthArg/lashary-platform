---
feature: payments
dri: pendiente
estado: en_progreso
actualizado: 2026-10-04
historias:
  - id: US-AGE-13
    estado: en_progreso
    falta: "integrar el anticipo por paquete implementado y probado en #178–#181, después de #173–#175; completar aprobaciones pendientes y resolver la conservación de exoneraciones de #118 mediante ADR-0009 y migración; traslado de criterios 2 y 3 a US-AGE-05 y 4 a US-AGE-12 aprobado por el PO"
flags: []
deuda: []
defectos: []
---

# payments

Anticipos, y la infraestructura de pagos sin historia propia (ADR-0007): el ledger append-only (DOM-005) nace con US-AGE-12/US-MOR-01, el registro de pago con comprobante con US-MOR-03/US-SHOP-02, y el export tabular con US-MOR-04. Esta feature es duena de las tablas y el value object; esas historias la construyen. Sin pasarela jamas.

## Qué hace hoy

Migración `supabase/migrations/20260924000000_payments_deposit_exemptions.sql`: tabla `payments_deposit_exemptions` (prefijo `payments_`, ARCH-006) — `client_id` (FK real a `clients_profiles`: a diferencia de `audit_events`, esta relación es homogénea y permanente, siempre apunta al mismo tipo de recurso; cruza el límite de feature, ver `docs/process/DEPENDENCIES.md`, «FK cross-feature», y `ON DELETE CASCADE` se llevaría el historial de exoneraciones de una clienta borrada), `exempted_by` (FK a `auth.users`, quién la otorgó), `reason`, `active` (por defecto `true`; la columna existe para cuando "levantar" una exoneración tenga su propia historia — hoy sin política de `UPDATE` para nadie), `created_at`/`updated_at` UTC (DOM-003). Índice único parcial `(client_id) WHERE active` — un cliente no puede tener dos exoneraciones vigentes a la vez, e indexa la FK (PERF-003) de paso. Índice en `exempted_by`.

RLS (SEC-001): `SELECT` e `INSERT` solo para staff (`public.auth_is_staff()`); sin políticas de `UPDATE` ni `DELETE` para nadie — "levantar" no es parte del criterio 5 de esta historia, se agrega cuando una historia futura lo exija.

Pruebas: `supabase/tests/database/payments_staff_access.test.sql` (pgTAP, control positivo: staff lee/inserta, nadie puede `UPDATE`/`DELETE`); `src/features/payments/__tests__/rls-isolation.test.ts` (SEC-002, control negativo: anon y una clienta autenticada real no leen ni escriben). Las suites que hablan con Supabase (esta y `db/__tests__/deposit-exemption-repository.integration.test.ts`) sondean la conexión en un `beforeAll`, no al cargar el módulo: sin variables de entorno se omiten completas; con variables pero sin Supabase respondiendo, cada prueba se omite con `skip`; con Supabase arriba corren todas.

Capa `domain/`: entidad `DepositExemption` con constructor validado (`DepositExemption.create` → `Result`), invariantes DOM-007 (cliente, quién exonera y razón no vacíos); nace siempre `active: true`. Error `DepositExemptionValidationError` (DOM-006). Reloj inyectado (DOM-004). Pruebas con fixtures de `shared/testing/fixed-clock.ts`.

Capa `application/`: puerto `DepositExemptionRepository` (`save`, lanza `ClientAlreadyExempt` ante la unicidad parcial de la base — mismo patrón que `TechniqueNameConflict` en catalog) y puerto `RecordAuditEvent` (hacia `audit.record()`, inyectado — `application/` no importa la feature `audit`, eso lo cablea `index.ts`). Use-case `exemptClient(deps)(input)` (`exempt-client.ts`): valida, guarda, y solo si guardó registra el evento en la bitácora (`payments.deposit_exemption.granted`); si el registro falla después de guardar, el error se propaga en vez de tragarse — tanto si `recordAuditEvent` lanza como si devuelve `err` (el puerto tipa el `Result` y `exemptClient` lo revisa) — nunca finge éxito silencioso. Las dos rutas tienen prueba (`__tests__/exempt-client.test.ts`). Pruebas con repositorio en memoria y `recordAuditEvent` falso (`__tests__/exempt-client.test.ts`).

Capa `db/`: `SupabaseDepositExemptionRepository` (`toRow` mapea dominio → fila, exportada con test unitario propio; `save()` distingue `23505` (unique_violation, la constraint parcial de `client_id` activo) y lo convierte en `ClientAlreadyExempt` — cualquier otro error de Supabase sigue siendo una falla de infra genuina). Prueba de integración: `save()` con token anónimo denegado por RLS.

`index.ts` (ARCH-003): `exemptClient(input)` — cablea el repositorio de servidor, `randomUUID()`, `systemClock` **y `audit.record()` real**, importado del entry point de `audit` (único import cross-feature de toda la historia — `domain/` y `application/` de `payments` no conocen a `audit`, ARCH-004).

Capa `ui/`: `schema.ts` (Zod, DOM-007), `messages.ts` (texto externalizado, DOM-009), `action-state.ts`, `require-staff.ts` (mismo patrón que catalog). `actions.ts`: `exemptClientAction` (valida con Zod, resuelve `exemptedBy` de la sesión admin real vía `getAuthSession`, llama a `exemptClient` — importado del propio `index.ts` de `payments`, no re-cablea `deps` a mano) y `searchClientsAction` (envuelve `listClientsAction` de `clients`, por su entry point — ARCH-003; el selector de clienta reusa el buscador que ya existe, no inventa uno; devuelve `{ ok: true, clients }` o `{ ok: false }` cuando no hay sesión staff o el listado falla, para que la UI distinga un fallo de una búsqueda sin coincidencias). `ExemptClientForm.tsx` (client component, DaisyUI/UI-001/002): busca clienta por nombre → selecciona de la lista → escribe la razón → envía. UI-003: la lista de resultados tiene estado vacío ("sin resultados"), de carga (botón "Buscando…" mientras `searchClientsAction` corre en una `useTransition`) y de error (`role="alert"` con `searchFailed`, distinto de "sin resultados"); tras una exoneración exitosa se ocultan la lista, la clienta seleccionada y el formulario de razón; UI-004: cada campo tiene `<label>` asociado, los resultados son `<button>` nativos (operables por teclado sin ARIA que finja un patrón de listbox que no se implementó), y el área de "sin resultados" es `aria-live="polite"`. Pruebas con `exemptClient`/`listClientsAction`/`getAuthSession` falsos (`__tests__/actions.test.ts`, `__tests__/schema.test.ts`) y una prueba de componente con `@testing-library/react` para el flujo buscar → seleccionar → enviar (`__tests__/ExemptClientForm.test.tsx`).

Al buscar de nuevo, el aviso del envío anterior (éxito o conflicto) se descarta; reaparece solo con el resultado del siguiente envío. Verificado en navegador real con Playwright contra Supabase local: búsqueda, selección, exoneración (fila en `payments_deposit_exemptions` y evento en `audit_events`), conflicto por duplicado y "sin resultados".

Ruta `src/app/admin/payments/`: `page.tsx` llama a `requireAdminSession()` (mensaje amable; RLS es la frontera real, SEC-001) y monta `ExemptClientForm` sin `<main>` propio (el layout de `/admin` ya aporta el landmark). Sin `loading.tsx`/`error.tsx` propios: a diferencia de `/admin/catalog`, esta página no hace una carga de datos bloqueante antes del primer render, así que no hay un estado de "cargando la página" que mostrar; si un incremento futuro agrega esa carga, entonces sí hace falta el `client.ts` que ese boundary exigiría (mismo motivo que documenta `catalog/ui/messages.ts`).

Con esto el **criterio 5 de US-AGE-13 queda completo**: la administradora puede exonerar el anticipo de una clienta específica desde `/admin/payments`, y la exoneración queda en la bitácora de auditoría.

## Qué no hace todavía

El contrato de conservación de exoneraciones al archivar clientas está propuesto en `docs/adr/ADR-0009-client-archival-and-exemptions.md`, respaldado por Bayron el 2026-10-03 y pendiente de revisión del equipo. Mantiene la FK específica a `clients_profiles` y propone una migración nueva de `ON DELETE CASCADE` a `RESTRICT`. La migración y su prueba contra la base real están pendientes; el esquema actual conserva `CASCADE` (feedback de #118).

US-AGE-13 conserva los criterios originales 1 (anticipo por técnica y paquete) y 5 (exoneración con bitácora). Falta definir y demostrar el anticipo por paquete del criterio 1, dependiente de US-PROD-01; la historia sigue `en_progreso`.

El PO aprobó trasladar los criterios originales 2 y 3 a US-AGE-05 (mostrar el anticipo y la advertencia antes de confirmar, y guardar los montos en la cita) y el 4 a US-AGE-12 (descontar el anticipo al cerrar). Bayron comunicó la aprobación el 2026-10-03; el registro está en `docs/process/DEPENDENCIES.md`. Son requisitos obligatorios de las historias de destino, pendientes de implementación y pruebas allí.

El feedback de #152 sobre los estilos se aplica en `ExemptClientForm.tsx` y `src/app/admin/payments/page.tsx`: ambos importan y usan el alias `STYLES`.

## Contrato público (`index.ts`, ARCH-003)

- `exemptClient(input: ExemptClientInput): Promise<Result<DepositExemptionView, DepositExemptionValidationError | ClientAlreadyExempt>>` — otorga la exoneración y la registra en la bitácora. `input`: `{ clientId, exemptedBy, reason }`.
- Tipos: `ExemptClientInput`, `DepositExemptionView`.
- Errores: `DepositExemptionValidationError` (campos vacíos), `ClientAlreadyExempt` (el cliente ya tiene una exoneración vigente).

## Evidencia del anticipo por paquete (2026-10-04)

El criterio original 1 está implementado en la pila #178–#181, basada en los paquetes de #173–#175: contrato, columna y RPC, dominio y repositorio, formulario y listado. El anticipo es propio del paquete, no la suma de sus técnicas; 0 significa sin anticipo. La edición y desactivación conservan el monto.

Verificación: 72 pruebas unitarias y de interfaz, 17 aserciones pgTAP en una base temporal aislada y tipado de src correcto. Incluye valores inválidos, límite entero seguro, RLS y rollback completo. Las tres pruebas HTTP existentes no pudieron pasar en el Supabase de desarrollo porque todavía no contiene las tablas de paquetes. La revisión independiente no dejó hallazgos pendientes; las aprobaciones de GitHub son un paso separado.

Esta rama documental no contiene el código de esa pila. US-AGE-13 permanece en progreso hasta integrar las dependencias y piezas, obtener las aprobaciones necesarias y resolver el hallazgo de conservación de exoneraciones. Detalle y orden en `docs/process/US-AGE-13-EVIDENCE.md`.
