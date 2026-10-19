---
feature: payments
dri: pendiente
estado: terminada
actualizado: 2026-10-19
historias:
  - id: US-AGE-13
    estado: terminada
    evidencia: "PR #240 (us/US-AGE-13 a main, 2026-10-13, aprobado); piezas #219 a #239 y #241 hacia us/US-AGE-13. Criterio 1, anticipo por tecnica: columna deposit de catalog_techniques (US-AGE-08), formulario y tabla del panel; pruebas catalog/domain/techniques/__tests__/technique.test.ts, ui/techniques/__tests__/technique-schema.test.ts y catalog_staff_write.test.sql. Criterio 1, anticipo por paquete: migraciones 20261004000001 y 20261004000002, RPC de guardado, dominio, formulario y listado; pruebas application/packages/__tests__/package-deposit.test.ts, ui/packages/__tests__/package-deposit-form.test.tsx, db/packages/__tests__/package-deposit-repository.test.ts y catalog_package_deposit.test.sql. Criterio 5, exoneracion con bitacora: exemptClient registra payments.deposit_exemption.granted en audit_events; pruebas payments/application/__tests__/exempt-client.test.ts, rls-isolation.test.ts, payments_staff_access.test.sql y payments_exemption_history.test.sql (la FK a clients_profiles es RESTRICT, ADR-0009). Verificado en el CI de main del 2026-10-14: las 6 suites pgTAP (87 aserciones) y las 113 de vitest en verde. Los criterios originales 2 y 3 son de US-AGE-05 y el 4 de US-AGE-12 (PO, 2026-10-03). #240 se fusiono con el check reglas en rojo por INT-008 (5 migraciones en un PR) y sin la etiqueta excepcion-proceso. Confirmada terminada por el PO el 2026-10-14"
flags: []
deuda: []
defectos: []
---

# payments

Anticipos, y la infraestructura de pagos sin historia propia (ADR-0007): el ledger append-only (DOM-005) nace con US-AGE-12/US-MOR-01, el registro de pago con comprobante con US-MOR-03/US-SHOP-02, y el export tabular con US-MOR-04. Esta feature es duena de las tablas y el value object; esas historias la construyen. Sin pasarela jamas.

## Qué hace hoy

Migración `supabase/migrations/20260924000000_payments_deposit_exemptions.sql`: tabla `payments_deposit_exemptions` (prefijo `payments_`, ARCH-006) — `client_id` (FK real a `clients_profiles`: a diferencia de `audit_events`, esta relación es homogénea y permanente, siempre apunta al mismo tipo de recurso; cruza el límite de feature, ver `docs/process/DEPENDENCIES.md`, «FK cross-feature», y la migración posterior `20261005000000_payments_exemption_history.sql` sustituye `CASCADE` por `RESTRICT` para impedir la pérdida de historial), `exempted_by` (FK a `auth.users`, quién la otorgó), `reason`, `active` (por defecto `true`; la columna existe para cuando "levantar" una exoneración tenga su propia historia — hoy sin política de `UPDATE` para nadie), `created_at`/`updated_at` UTC (DOM-003). Índice único parcial `(client_id) WHERE active` — un cliente no puede tener dos exoneraciones vigentes a la vez, e indexa la FK (PERF-003) de paso. Índice en `exempted_by`.

RLS (SEC-001): `SELECT` e `INSERT` solo para staff (`public.auth_is_staff()`); sin políticas de `UPDATE` ni `DELETE` para nadie — "levantar" no es parte del criterio 5 de esta historia, se agrega cuando una historia futura lo exija.

Pruebas: `supabase/tests/database/payments_staff_access.test.sql` (pgTAP, control positivo: staff lee/inserta, nadie puede `UPDATE`/`DELETE`); `src/features/payments/__tests__/rls-isolation.test.ts` (SEC-002, control negativo: anon y una clienta autenticada real no leen ni escriben). Las suites que hablan con Supabase (esta y `db/__tests__/deposit-exemption-repository.integration.test.ts`) sondean la conexión en un `beforeAll`, no al cargar el módulo: sin variables de entorno se omiten completas; con variables pero sin Supabase respondiendo, cada prueba se omite con `skip`; con Supabase arriba corren todas.

Capa `domain/`: entidad `DepositExemption` como `interface` de campos `readonly`, con una marca `unique symbol` no exportada que solo pone `buildDepositExemption(id, input)` (→ `Result`, DOM-007) y `depositExemptionToView`; invariantes DOM-007 (cliente, quién exonera y razón no vacíos); nace siempre `active: true`. Errores como interfaces con `code` literal, fábrica y guarda (`PAYMENTS_ERROR_CODES`, `depositExemptionValidationError`/`isDepositExemptionValidationError`, `clientAlreadyExempt`/`isClientAlreadyExempt`), sin `class` ni `instanceof` (ADR-0008, DOM-006). Reloj inyectado (DOM-004). Pruebas con fixtures de `shared/testing/fixed-clock.ts`.

Capa `application/`: puerto `DepositExemptionRepository` (`save` devuelve `Result<void, ClientAlreadyExempt>` ante la unicidad parcial de la base — mismo patrón que `packageNameConflict` en catalog; solo las fallas de infraestructura lanzan `Error`) y puerto `RecordAuditEvent` (hacia `audit.record()`, inyectado — `application/` no importa la feature `audit`, eso lo cablea `index.ts`). Use-case `exemptClient(deps)(input)` (`exempt-client.ts`): valida, guarda, y solo si guardó registra el evento en la bitácora (`payments.deposit_exemption.granted`); si el registro falla después de guardar, el error se propaga en vez de tragarse — tanto si `recordAuditEvent` lanza como si devuelve `err` (el puerto tipa el `Result` y `exemptClient` lo revisa) — nunca finge éxito silencioso. Las dos rutas tienen prueba (`__tests__/exempt-client.test.ts`). Pruebas con un repositorio en memoria (función fábrica) y `recordAuditEvent` falso (`__tests__/exempt-client.test.ts`).

Capa `db/`: `createSupabaseDepositExemptionRepository(db)` (función fábrica que devuelve el puerto, sin `class`; `depositExemptionRepository()` la cablea con el cliente de servidor; `toRow` mapea dominio → fila, exportada con test unitario propio; `save()` distingue `23505` (unique_violation, la constraint parcial de `client_id` activo) y lo devuelve como `err(clientAlreadyExempt(...))` — cualquier otro error de Supabase sigue siendo una falla de infra genuina). Prueba de integración: `save()` con token anónimo denegado por RLS.

`index.ts` (ARCH-003): `exemptClient(input)` — cablea el repositorio de servidor, `randomUUID()`, `systemClock` **y `audit.record()` real**, importado del entry point de `audit` (único import cross-feature de toda la historia — `domain/` y `application/` de `payments` no conocen a `audit`, ARCH-004).

Capa `ui/`: `require-staff.ts` en la raíz (reusa `isStaffRole` de `auth`, sin su propia lista de roles) y el área `ui/admin-exemptions/` con la misma estructura que `clients`: `validation/exemption-schema.ts` (Zod, DOM-007), `constants/exemption-strings.ts` (`exemptionMessages`, texto externalizado, DOM-009), `types/exempt-client-action-state.ts` y `actions/exemption-actions.ts`: `exemptClientAction` (valida con Zod, resuelve `exemptedBy` de la sesión admin real vía `getAuthSession`, llama a `exemptClient` — importado del propio `index.ts` de `payments`, no re-cablea `deps` a mano) y `searchClientsAction` (envuelve `listClientsAction` de `clients`, por su entry point — ARCH-003; el selector de clienta reusa el buscador que ya existe, no inventa uno; devuelve `{ ok: true, clients }` o `{ ok: false }` cuando no hay sesión staff o el listado falla, para que la UI distinga un fallo de una búsqueda sin coincidencias). `components/ExemptClientForm/` (client component, DaisyUI/UI-001/002; el aviso de resultado es el componente `components/ExemptClientFeedback/`, con `.styles.ts` importado como `STYLES`, `.types.ts` e `index.ts` cada uno): busca clienta por nombre → selecciona de la lista → escribe la razón → envía. UI-003: la lista de resultados tiene estado vacío ("sin resultados"), de carga (botón "Buscando…" mientras `searchClientsAction` corre en una `useTransition`) y de error (`role="alert"` con `searchFailed`, distinto de "sin resultados"); tras una exoneración exitosa se ocultan la lista, la clienta seleccionada y el formulario de razón; UI-004: cada campo tiene `<label>` asociado, los resultados son `<button>` nativos (operables por teclado sin ARIA que finja un patrón de listbox que no se implementó), y el área de "sin resultados" es `aria-live="polite"`. Pruebas con `exemptClient`/`listClientsAction`/`getAuthSession` falsos (`ui/admin-exemptions/__tests__/exemption-actions.test.ts`, `exemption-schema.test.ts`) y una prueba de componente con `@testing-library/react` para el flujo buscar → seleccionar → enviar (`ExemptClientForm.test.tsx`).

Al buscar de nuevo, el aviso del envío anterior (éxito o conflicto) se descarta; reaparece solo con el resultado del siguiente envío. Verificado en navegador real con Playwright contra Supabase local: búsqueda, selección, exoneración (fila en `payments_deposit_exemptions` y evento en `audit_events`), conflicto por duplicado y "sin resultados".

Ruta `src/app/admin/payments/`: `page.tsx` llama a `requireAdminSession()` (mensaje amable; RLS es la frontera real, SEC-001) y monta `ExemptClientForm` sin `<main>` propio (el layout de `/admin` ya aporta el landmark). Sin `loading.tsx`/`error.tsx` propios: a diferencia de `/admin/catalog`, esta página no hace una carga de datos bloqueante antes del primer render, así que no hay un estado de "cargando la página" que mostrar; si un incremento futuro agrega esa carga, entonces sí hace falta el `client.ts` que ese boundary exigiría (mismo motivo que documenta `catalog/ui/messages.ts`).

Con esto el **criterio 5 de US-AGE-13 queda completo**: la administradora puede exonerar el anticipo de una clienta específica desde `/admin/payments`, y la exoneración queda en la bitácora de auditoría.

## Qué no hace todavía

El contrato de conservación de exoneraciones al archivar clientas está documentado en `docs/adr/ADR-0009-client-archival-and-exemptions.md`, aceptado por el equipo, según el acuerdo comunicado por Bayron el 2026-10-05. Mantiene la FK específica a `clients_profiles` y requiere una migración nueva de `ON DELETE CASCADE` a `RESTRICT`. La migración `20261005000000_payments_exemption_history.sql` implementa esa protección. `payments_exemption_history.test.sql` demuestra en PostgreSQL local el bloqueo del borrado directo e indirecto, la conservación de perfiles y exoneraciones activas e históricas y la integridad de la FK. Su integración y aplicación en producción siguen pendientes. El archivado y la revisión de exoneraciones al reactivar clientas aún no están implementados.

US-AGE-13 conserva los criterios originales 1 (anticipo por técnica y paquete) y 5 (exoneración con bitácora). Los dos están en `main` desde #240 (2026-10-13) y la historia está `terminada` desde el 2026-10-14: la evidencia criterio por criterio está en el front-matter.

El PO aprobó trasladar los criterios originales 2 y 3 a US-AGE-05 (mostrar el anticipo y la advertencia antes de confirmar, y guardar los montos en la cita) y el 4 a US-AGE-12 (descontar el anticipo al cerrar). Bayron comunicó la aprobación el 2026-10-03; el registro está en `docs/process/DEPENDENCIES.md`. Son requisitos obligatorios de las historias de destino, pendientes de implementación y pruebas allí.

El feedback de #152 sobre los estilos se aplica en `ExemptClientForm` y `src/app/admin/payments/page.tsx`: ambos importan y usan el alias `STYLES`.

## Contrato público (`index.ts`, ARCH-003)

- `exemptClient(input: ExemptClientInput): Promise<Result<DepositExemptionView, DepositExemptionValidationError | ClientAlreadyExempt>>` — otorga la exoneración y la registra en la bitácora. `input`: `{ clientId, exemptedBy, reason }`.
- Contrato SQL `public.payments_deposit_due(client_id, deposit)` (migración `20261019000000_payments_deposit_due_fn.sql`), para la reserva de US-AGE-05: devuelve `0` si la clienta tiene una exoneración vigente y el mismo `deposit` si no, para que `scheduling` no lea `payments_deposit_exemptions` (ARCH-005, INT-003). **Ningún rol de la API la ejecuta** (`anon`, `authenticated` y `service_role` sin `EXECUTE`): recibe un id de clienta y, si se pudiera llamar directo, cualquiera sabría quién está exonerada (SEC-005). La llaman las funciones de reserva de `scheduling`, que corren como el dueño de la base, con el id sacado de la sesión. `SECURITY INVOKER`, sin elevar permisos. Prueba: pgTAP `payments_deposit_due.test.sql`.
- Tipos: `ExemptClientInput`, `DepositExemptionView`.
- Errores (tipos, sin valor en runtime): `DepositExemptionValidationError` (campos vacíos), `ClientAlreadyExempt` (el cliente ya tiene una exoneración vigente); guardas `isDepositExemptionValidationError` e `isClientAlreadyExempt`.

## Evidencia del anticipo por paquete (2026-10-05)

El criterio original 1 está implementado en la pila #178–#181, basada en los paquetes de #173–#175: contrato, columna y RPC, dominio y repositorio, formulario y listado. El anticipo es propio del paquete, no la suma de sus técnicas; 0 significa sin anticipo. La edición y desactivación conservan el monto.

Verificación: 72 pruebas unitarias y de interfaz, 17 aserciones pgTAP en una base temporal aislada y tipado de src correcto. Incluye valores inválidos, límite entero seguro, RLS y rollback completo. Las tres pruebas HTTP existentes no pudieron pasar en el Supabase de desarrollo porque todavía no contiene las tablas de paquetes. La revisión independiente no dejó hallazgos pendientes; las aprobaciones de GitHub son un paso separado.

Esta pieza documental continúa después de #181 y hereda el código de la pila unificada; su diff solo añade evidencia. Las piezas se integraron con #240 el 2026-10-13, y la conservación de exoneraciones quedó resuelta con la pieza 21 (abajo). Detalle y orden en `docs/process/US-AGE-13-EVIDENCE.md`.

La pila se actualizó con main después del squash de #175: 20 piezas en una sola cadena, conservando el historial mediante merge commits, sin push forzado. Pasaron 117 pruebas unitarias/UI combinadas, 58 aserciones SQL (21 de invariantes, 17 de anticipo, 10 de audit y 10 de payments) y el tipado de src.

## Protección del historial de exoneraciones (pieza 21/21)

Una migración nueva cambia únicamente la acción de borrado de la FK de clientas a RESTRICT, dentro de una transacción. Conserva las filas existentes, índices y políticas RLS. No cambia la API ni implementa archivado. Las 16 aserciones de payments_exemption_history.test.sql pasan en una base PostgreSQL local temporal; las pruebas detectaron la pérdida de historial con CASCADE antes del cambio. Integrada con #240; `payments_exemption_history.test.sql` pasa en el CI de `main`.
