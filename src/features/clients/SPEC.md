---
feature: clients
dri: pendiente
estado: en_progreso
actualizado: 2026-10-31
historias:
  - id: US-CLI-01
    estado: en_progreso
    falta: "las columnas de morosidad y ultima cita existen sin dato y no tienen filtro: el dato espera a US-MOR-01 y el de ultima cita a US-AGE-05 (criterios diferidos)"
  - id: US-CLI-02
    estado: terminada
    evidencia: "Pila de 5 piezas sobre main: PRs #481 (1/5, contrato scheduling-api.md), #483 (2/5, listClientAppointments), #505 (3/5, caso de uso y estado del anticipo), #506 (4/5, pestaña Citas) y #507 (5/5, paginacion y enlace desde el listado), y el PR de cierre us/US-CLI-02 a main. Criterio 1 (servicio, fecha, estado de la cita y estado de pago; las anotaciones trasladadas a US-CLI-03): deposit-status.test.ts, view-appointment-history.test.ts, history-gateways.test.ts, history-queries.test.ts, appointment-history.test.tsx. Criterio 2 (de la mas reciente a la mas antigua): client-appointments-repository.test.ts de scheduling (ordena por starts_at descendente) y appointment-history.test.tsx (la tabla respeta el orden recibido). Criterio 3 (desde el listado y desde la vista diaria): clients-list.test.tsx (listado), src/app/admin/citas/agenda/page.test.tsx (la agenda arma el enlace con clientAppointmentsPath) y DailyAgendaView.test.tsx de scheduling (la tarjeta pinta el enlace «Ver sus citas»)"
  - id: US-CLI-03
    estado: no_iniciada
  - id: US-CLI-04
    estado: terminada
    evidencia: "Pila de 20 piezas: PRs #369 (1/20, esquema), #370 (2/20, bucket), #372, #374, #384, #385, #394, #395, #396, #404, #405, #406, #407, #408 (14/20, cierre funcional), #409 y #410 (mejoras visuales) y los PRs de las piezas 17/20 a 20/20 (auditoria del 2026-10-19). Criterio 1 (estudio con texto e imagenes): record-content.test.ts, record-changes.test.ts, record-commands.test.ts, study-editor.test.tsx, add-record-image.test.ts, record-image.test.ts, record-image-action.test.ts, images-editor.test.tsx. Criterio 2 (alergias, sensibilidades, condiciones): clients_record_versions.test.sql (categorias), record-content.test.ts, precautions-editor.test.tsx. Criterio 3 (solo la administradora y cada acceso en la bitacora): clients_record_versions.test.sql y clients_record_images_bucket.test.sql (aislamiento SEC-002 frente a clienta y anon), view-record.test.ts (bitacora fail-closed), record-gateways.test.ts, record-actions.test.ts, record-queries.test.ts. Criterio 4 (historial de cambios): clients_record_versions.test.sql (sin UPDATE ni DELETE, una sucesora por version), record-changes.test.ts, record-commands.test.ts (dos cambios simultaneos), record-history.test.ts, record-view.test.tsx. Criterio 5 (imagenes sin URL publica): clients_record_images_bucket.test.sql (bucket privado), record-image-storage.test.ts (URLs firmadas de 5 minutos), images-editor.test.tsx"
  - id: US-CLI-05
    estado: terminada
    evidencia: "PR #16, PR #28, PR #31, PR #32, tests: clients-actions.test.ts, save-client.test.tsx, list-clients.test.ts, clients-list.test.tsx, update-client.test.ts, edit-client.test.tsx"
flags: []
deuda:
  - que: "Prueba de aislamiento RLS (SEC-002) de las politicas de administradora de clients_profiles (supabase/migrations/20260911000000_clients_profiles_admin_access.sql): las pruebas simulan Supabase y no demuestran que una clienta con token valido no pueda leer, crear ni editar a otras"
    aceptada_en: "PR #32, etiqueta excepcion-proceso"
    costo: "3h: arnes de Supabase local en CI y el test con token de clienta contra SELECT, INSERT y UPDATE; 1h si ya existe el arnes de la deuda de auth (PR #3)"
  - que: "M2 de la auditoria de US-CLI-04: escribir el expediente guarda la version y despues audita, sin transaccion. Si la bitacora falla, el cambio queda sin evento; la pantalla lo avisa como saved-without-audit"
    aceptada_en: "Auditoria del 2026-10-19, por decision de Jose Loria; mismo pendiente heredado de US-AGE-13"
    costo: "4h: funcion SQL que inserte version y evento en una transaccion, con contrato pactado con audit (INT-003), y su pgTAP"
  - que: "M3 de la auditoria de US-CLI-04 (riesgo aceptado): una admin con su token puede leer clients_record_versions directo por PostgREST sin pasar por readRecord, y esa lectura no queda en la bitacora (SEC-006 se cumple solo dentro de la app)"
    aceptada_en: "Auditoria del 2026-10-19, riesgo aceptado por Jose Loria"
    costo: "6h: quitar el SELECT directo y leer por una funcion SECURITY DEFINER que registre el acceso y devuelva las versiones, con pgTAP"
  - que: "Resto de M4 de la auditoria de US-CLI-04: si guardar la version falla despues de subir la imagen (choque de versiones o caida), el archivo queda en el bucket privado sin version que lo use, y no se puede borrar porque el bucket no tiene politica de DELETE"
    aceptada_en: "Auditoria del 2026-10-19, por decision de Jose Loria; el cupo de 20 ya se revisa antes de subir"
    costo: "3h: limpieza programada fuera de la app que borre objetos sin version de mas de un dia"
  - que: "B4 de la auditoria de US-CLI-04: rowToVersion revalida cada version con las reglas vigentes; si un tope se endurece o una fila quedo rara, el expediente entero no abre"
    aceptada_en: "Auditoria del 2026-10-19, por decision de Jose Loria"
    costo: "2h: leer el historial sin revalidar topes (solo la forma) y validar solo al escribir"
defectos: []
---

# clients

Gestion de clientas: ficha, historial, anotaciones, expediente sensible (SEC-006).

## Qué hace hoy

Existe la ruta `/admin/clients`, dentro del panel de administración. Renderiza el encabezado de la
sección y el botón **Agregar**, que abre el modal de alta. El modal solo cierra con Cancelar o Escape,
y con datos escritos pide confirmar con el `ConfirmDialog` del proyecto. El foco queda confinado al
diálogo y vuelve a *Agregar* al cerrar (UI-004).

*Guardar* llama a `createClientAction()`, que vuelve a validar con `validateClientForm` (DOM-007),
incluidos los largos máximos de nombre, teléfono y correo, que en el navegador solo impone el `maxLength` del HTML;
normaliza el teléfono con `normalizePhone`, guarda `phone_verified = true` y deja `user_id` en `NULL`
(clienta sin cuenta). Antes de insertar revisa en la base que el teléfono no esté registrado
(criterio 3); si lo está, no guarda y el modal muestra `phoneTaken`. Mientras guarda, el botón dice *Guardando…*, se deshabilita y el modal no se
cierra; si el servidor rechaza, el mensaje aparece dentro del modal y lo escrito se conserva. El error
de la base nunca llega a la pantalla: la action devuelve `{ ok: false, error }` con un texto de
`CLIENTS_ERROR_MESSAGES`. La action también llama a `requireAdminSession()`.

Debajo, `ClientsList` muestra las clientas en una tabla de seis columnas: nombre (celda `th scope="row"`),
teléfono, correo, morosidad, última cita y acciones. Morosidad y última cita muestran
`CLIENTS_TABLE_TEXTS.pendingColumnValue` ("Sin dato") en todas las filas: la columna existe, el dato no
(criterios diferidos). `clients-list.test.tsx` exige los seis encabezados en orden, tantas celdas por fila
como encabezados, y el texto de dato pendiente en las dos columnas diferidas. Las clientas las lee la
página en el servidor con `listClientsAction()`:
la primera página de 25, las más recientes primero y solo las columnas que muestra (PERF-002, PERF-005).
La action ya recibe `{ page, pageSize, name }` y devuelve `{ clients, total, page, pageSize }`
(US-CLI-01, sin pantalla todavía): el tamaño solo puede ser uno de `CLIENTS_LIST_LIMITS.pageSizes`
(10, 25 o 50) y cualquier otro valor usa 25; una página inválida es la 0; `name` filtra `full_name` con
`ilike`, recortado a 120 caracteres, con `%`, `_` y `\` escapados y `*` quitado (PostgREST lo lee como
`%`), así que lo escrito se busca como texto. `total` sale de `count: 'exact'` y cuenta todo lo que
cumple el filtro. La página lee `?page`, `?pageSize` y `?name` de la URL y se los pasa.
Sobre la tabla, `ClientsNameFilter` es un `<form role="search">` con un campo de nombre limitado a
`CLIENTS_LIST_LIMITS.nameFilterMaxLength`: al enviarlo escribe `?name` y borra `?page`, un texto en blanco
quita el filtro, y con filtro activo aparece *Quitar filtro*. Sin coincidencias, la lista nombra el filtro
en vez de decir que no hay clientas registradas (UI-003). Lo demuestran `clients-name-filter.test.tsx` y
`clients-list.test.tsx`. Debajo de la tabla, `ClientsPagination` muestra "Página X de Y" con el total de clientas,
*Anterior* y *Siguiente* como enlaces que solo cambian `page` y conservan el resto de la consulta, y un
selector de 10, 25 o 50 que al cambiar vuelve a la primera página. En la primera y en la última página
el enlace que no aplica se dibuja como texto, no como enlace muerto. Cuando la lectura falla o no hay
ninguna clienta, la paginación no se dibuja. Lo demuestra `clients-pagination.test.tsx`. Tiene sus tres estados (UI-003): carga en
`src/app/admin/clients/loading.tsx` (`role="status"`), error con *Reintentar* (`router.refresh()`) y
vacío que sugiere *Agregar*. Tras un alta, `revalidatePath` vuelve a leer y la clienta nueva aparece.

Cada clienta tiene un lápiz de solo icono cuyo `aria-label` la nombra (UI-004). El lápiz abre
`EditClientDialog`, el mismo modal y formulario con los datos cargados: salir con cambios pide
confirmar y el foco vuelve a ese lápiz. *Guardar* llama a `updateClientAction(id)`, que valida igual
que el alta, repite la revisión de teléfono único excluyendo a la propia clienta y no toca
`phone_verified`; si RLS no deja ver la fila, responde `clientNotFound` en vez de fingir éxito
(SEC-005). Alta y edición comparten `useClientDialog`: *Guardando…*, bloqueo de cierre y error
dentro del modal.

Control de acceso de la capa de aplicación: la página y cada action llaman a
`requireAdminSession()` de `auth`, de modo que una visitante anónima o una clienta con sesión de
Google son redirigidas a `/admin`. El middleware de Edge ya cubría `/admin/*` (salvo `/admin`
exacto), pero solo comprueba que haya sesión, no el rol — el rol lo comprueba esta página.

La estructura de carpetas sigue las capas de `docs/spec/ARCHITECTURE.md`, como `_template` y
`catalog`: `domain/` (la clienta, sus límites, `normalizePhone` y `validateClientForm`),
`application/` (los casos de uso `addClient`, `editClient` y `listClients`, el puerto
`ClientRepository` y `CLIENTS_LIST_LIMITS`), `db/` (`clientRepository()`, lo único que conoce
Supabase y `clients_profiles`) y `ui/` (todo en el área `ui/admin-clients/`: las server actions en `ui/admin-clients/actions/client-actions.ts`, los textos en
`ui/admin-clients/constants/client-strings.ts`, los hooks en `ui/admin-clients/hooks/` y un subdirectorio por componente en `ui/admin-clients/components/`; lo que comparten `admin-clients` y `admin-record`, `ConfirmDialog` y `useFocusTrap`, vive en `ui/shared/`). `http/` guarda solo los adaptadores a otras features (`http/record/record-gateways.ts`); no hay route handlers. `ui/admin-clients/clients-list-url.ts` guarda la
construcción pura de URLs del listado, separada de `ui/admin-clients/hooks/` porque no usa React: así se prueba sin
renderizar. Las pruebas de la interfaz están en `ui/admin-clients/__tests__/` y las de los casos de uso en `application/__tests__/`.

### Expediente de la clienta (US-CLI-04)

Cada fila del listado enlaza a la ficha `/admin/clients/<id>`: volver, nombre, teléfono y la pestaña
**Expediente**. La pestaña muestra el estudio con su técnica recomendada, "Antecedentes y
precauciones" con su categoría, las imágenes y el historial de cambios, y permite registrar y editar
el estudio, agregar (**+**) y quitar antecedentes y subir imágenes. Cada cambio guarda una versión
completa nueva en `clients_record_versions`; la vigente es la última y las anteriores no se tocan.
Cada lectura y cada cambio quedan en la bitácora de `audit`; si la bitácora falla al leer, el
expediente no se muestra. Capas: `domain/record/` (el contenido y sus cambios),
`application/record/` (puertos, lectura y escritura), `http/record/` (adaptadores a `audit` y
`catalog`), `db/record/` (versiones, categorías e imágenes) y `ui/admin-record/` (actions de
escritura, lecturas en `queries/`, textos y componentes); la ruta vive en `src/app/admin/clients/[id]/`. Crear categorías nuevas desde el menú
quedó fuera del plan por decisión de José Loría.

### Historial de citas (US-CLI-02)

La pestaña **Citas** de la ficha (`/admin/clients/<id>/citas`, `clientAppointmentsPath`) muestra
`AppointmentHistory`: una tabla con fecha (en la hora del estudio, `formatAppointmentDate`), servicio,
estado, pago (el estado del anticipo) y anotaciones (`HISTORY_LABELS.pendingValue` hasta US-CLI-03), en
el orden en que llegan, de la más reciente a la más antigua; sin citas, un texto vacío. La página lee con
`readAppointmentHistory(clientId, page)` (`ui/admin-history/queries/`, sin `'use server'`): exige
`requireAdminSession()`, comprueba que la clienta exista (SEC-005) y pide las citas a `scheduling` por
`http/history/history-gateways.ts` (ARCH-005), que lee un fallo o una excepción como
`history-unavailable`, nunca como historial vacío. `viewAppointmentHistory` (`application/history/`) le
pone a cada cita `depositStatusOf()` (`domain/history/`): `none`, `registered` o `pending`, también a
medias. Carga en `loading.tsx`, error con `LoadError` y `error.tsx` (UI-003). Pruebas:
`deposit-status.test.ts`, `view-appointment-history.test.ts`, `history-gateways.test.ts`,
`history-queries.test.ts`, `appointment-history.test.tsx` y `src/app/admin/clients/[id]/layout.test.tsx`.

La página va en la URL (`?page`, desde 0; `parseHistoryPage` lee cualquier otro valor como 0 y
`appointmentHistoryUrl` no escribe `?page` en la primera), como el listado (decisión del 2026-09-20).
`AppointmentHistoryPagination` muestra "Página X de Y · N citas" y *Anterior*/*Siguiente* como enlaces,
o como texto cuando no aplican; sin citas no se dibuja. Es un componente de servidor: no tiene selector
de tamaño, así que no necesita `router.push`. Una página más allá de la última redirige a la primera en
vez de decir que la clienta no tiene citas. Cada fila del listado tiene, junto al expediente, un enlace
de solo icono a su historial con `aria-label` que la nombra (UI-004). Pruebas:
`appointment-history-pagination.test.tsx`, `src/app/admin/clients/[id]/citas/page.test.tsx` y
`clients-list.test.tsx`.

Desde la agenda diaria de `scheduling` (US-AGE-11), cada tarjeta de cita tiene «Ver sus citas», que
lleva a esta pestaña. La ruta `src/app/admin/citas/agenda/page.tsx` arma ese enlace con
`clientAppointmentsPath`; `scheduling` no importa `clients`, recibe la función ya armada
(`ClientLinks`). Prueba: `src/app/admin/citas/agenda/page.test.tsx`.

## Qué no hace todavía

No existe un flujo de archivado o borrado de clientas en esta rama. `docs/adr/ADR-0009-client-archival-and-exemptions.md` recoge el acuerdo de archivar sin eliminar el perfil ni sus referencias, comunicado por Bayron el 2026-10-05. Antes de implementarlo deben acordarse permisos, búsquedas y reservas, citas existentes y restauración. La pieza 21 de US-AGE-13 implementa y prueba la migración de `payments` a `ON DELETE RESTRICT`; bloquea el borrado de perfiles con exoneraciones activas o históricas, incluso desde `auth.users`. Su integración sigue pendiente. Reactivar un perfil deberá revisar la vigencia de su exoneración antes de aplicarla. Este cambio de documentación no implementa archivado ni completa una historia de `clients`.

**No hay prueba de aislamiento RLS (SEC-002)**; está registrada como deuda. Las pruebas de las
actions simulan Supabase: demuestran qué se envía y se lee, no qué permite RLS.

La tabla `public.clients_profiles` existe desde la migración
`20260901000000_auth_roles_and_clients.sql`, pero hoy solo la escribe `auth` cuando una clienta se
registra con Google, además del alta de esta feature. Le falta lo que US-CLI-05 necesita:

- la prueba de aislamiento (SEC-002) de la política RLS de administradora de
  `20260911000000_clients_profiles_admin_access.sql`.

El listado con filtros y paginación **no pertenece a esta historia**: es US-CLI-01, que depende de
esta. US-CLI-05 solo necesita buscar por teléfono para detectar el duplicado.

En el historial de citas (US-CLI-02), las anotaciones dicen "Sin dato" hasta US-CLI-03.

## Contrato público (`src/features/clients/index.ts`)

Único punto de entrada (ARCH-003). Exporta `AddClientDialog` —lo que monta la ruta—, el modal, el
`ConfirmDialog`, el formulario, `AddClientButton`, `ClientsList`, `ClientRecord`, los hooks
`useClientForm`, `useClientDialog` y `useFocusTrap`, `createClientAction`, `listClientsAction` y `updateClientAction` con sus tipos
`SaveClientResult`, `ListClientsQuery` y `ListClientsResult`, `validateClientForm`, `normalizePhone` y las constantes de
textos y límites, entre ellas `CLIENTS_LIST_LIMITS`, `CLIENTS_TABLE_HEADERS`, `CLIENTS_TABLE_TEXTS` , `CLIENTS_PAGINATION_TEXTS` y `CLIENTS_FILTER_TEXTS` (DOM-009).
También exporta `ClientsPagination` y `ClientsNameFilter`. Para la ficha y el expediente (US-CLI-04):
`getClientAction`, `CLIENTS_PATH`, `clientRecordPath`, `CLIENT_PROFILE_LABELS`, `RecordView`,
`LoadError`, `readRecord`, `readTechniqueOptions`, `readCategoryOptions`, `RECORD_LABELS` y
`STUDY_FORM_LABELS`. Para el historial (US-CLI-02): `clientAppointmentsPath`, `AppointmentHistory`,
`readAppointmentHistory` con `ReadAppointmentHistoryResult` y `HISTORY_LABELS`.
`src/features/clients/client.ts` es la entrada para código del navegador (`error.tsx`): solo
`LoadError`, `RECORD_LABELS` y `HISTORY_LABELS`, sin nada de servidor.

`getClientContactForReminders` (US-NOT-03, ARCH-005): lectura pública de solo teléfono y email
para que `notifications` nunca consulte `clients_profiles` directo. Hace su propia consulta
pidiendo solo `phone, email` — corregido en la auditoría del líder del 2026-10-23 (hallazgo M5):
antes reusaba `getClient`, que trae todas las columnas (incluida `notes`, el dato más sensible de
la feature) y las descartaba después de leerlas; ahora `notes` ni se pide. Sin
`requireAdminSession` — es para el cron, sin cookies; la RLS de `clients_profiles` sigue siendo la
frontera real (SEC-001). Sin comentarios en el código: el porqué vive aquí. La consulta en sí vive
en `db/reminder-contact-repository.ts` (revisión del líder del 2026-10-26: antes vivía directo en
`reminders-api.ts`, mezclando la capa pública con la consulta a Supabase); `reminders-api.ts`
solo resuelve el `SupabaseClient` por defecto (cookies) o usa el que el cron le pasa, y delega.
Consumidor: `notifications/index.ts`. `clientRepository` (`db/client-repository.ts`, otra función,
sin relación con esta lectura) perdió su parámetro `db` inyectable: nadie en el repo lo llamaba con
un cliente real desde que esta lectura dejó de reusarlo (M5) — quedaba sin uso.
Prueba de integración contra Supabase local (A6 de la auditoría, 2026-10-24):
`__tests__/reminders-api.integration.test.ts` — trae `phone`/`email` de una clienta real sembrada
con una nota clínica real (prueba que `notes` nunca sale), `null` para una clienta inexistente, y
anon no lee ningún contacto (SEC-002).

## Invariantes

- **La sección es exclusiva de la administradora.** `/admin/clients` exige rol `admin` o
  `superadmin` vía `requireAdminSession()`. Esa comprobación es el mensaje de error amable; la
  defensa real es la política RLS de la tabla (SEC-001), que aún no tiene prueba de aislamiento.
- **Toda tabla de esta feature lleva el prefijo `clients_`** (ARCH-006) y RLS activo con su prueba
  de aislamiento cross-cliente en CI (SEC-002).
- **El teléfono identifica a una clienta.** No pueden coexistir dos con el mismo número (criterio 3).
- **Una clienta creada a mano por la administradora nace con el teléfono verificado** (criterio 4).
- **El expediente es dato sensible** (SEC-006): solo lo lee y escribe la administradora (RLS con
  `auth_is_admin()`), cada lectura y cada cambio quedan en la bitácora, y sus imágenes viven en un
  bucket privado y se ven solo con URLs firmadas de 5 minutos.
- **El historial del expediente no se reescribe ni se borra:** la base no tiene políticas de UPDATE
  ni DELETE en `clients_record_versions` ni en el bucket de imágenes.

## Decisiones

- **2026-09-07 — La feature sigue la distribución de carpetas de `auth`** y no las capas
  `domain/ application/ http/ db/` de `docs/spec/ARCHITECTURE.md`. Motivo: consistencia con el único
  código que existe hoy. **Consecuencia asumida:** `check-domain-purity.sh` solo vigila `domain/` y
  `application/`, así que DOM-004 (`new Date()` prohibido) queda sin check automático aquí y depende
  de revisión humana.
- **2026-09-07 — US-CLI-05 se entrega en varios PRs**, uno por criterio de aceptación, porque la
  historia completa excede el límite de 400 líneas de INT-002.
- **2026-09-14 — "Unificar" queda fuera de US-CLI-05 por decisión de José Loría**: el criterio 3 se
  reduce a impedir el duplicado por teléfono. El backlog no se editó y sigue pidiendo unificar.
- **2026-09-07 — Pendiente de acuerdo contrato-primero (INT-003): cómo comprueba esta feature que la
  sesión es de una administradora.** El dato vive en `auth_user_roles`, tabla de `auth`, y ARCH-005
  prohíbe consultarla directamente. Propuesta: función `SECURITY DEFINER` publicada por `auth`.
- **2026-09-07 — El criterio 1 se entrega primero solo como interfaz** y **no está cumplido** hasta
  que escriba en la base con su prueba. `email` es obligatorio: `clients_profiles.email` es `NOT NULL`.
- **2026-09-08 — El estado de errores borra la clave, no la vacía**; si sobrevive, el resumen rojo no
  se retira. Cubierto por `form-error-summary.test.tsx`.
- **2026-09-12 — El alta se parte en dos PRs apilados (INT-002):** este, sin montar, y el modal con
  su confirmación de descarte. `useFocusTrap` entra aquí; su prueba llega con el modal que lo usa.
- **2026-09-12 — `ConfirmDialog` vive en `clients`, no en `shared/`**: un solo consumidor no justifica
  una API compartida. Trampa de foco cubierta por `modal-focus-trap.test.tsx`.
- **2026-09-14 — Alta y edición comparten `ClientModal` y `ClientForm`** (antes `AddClient*`). `isDirty`
  compara contra los valores iniciales: cancelar la edición sin tocar nada no pregunta (`edit-client.test.tsx`).
- **2026-09-14 — El descarte confirmado está duplicado** en `AddClientDialog` y `EditClientDialog`
  (~12 líneas) para caber en INT-002; se extrae a un hook cuando llegue la persistencia.
- **2026-09-15 — La persistencia entra por tareas (INT-002): primero solo el alta**, en
  `feat/US-CLI-05-persist-clients` apilada sobre `feat/US-CLI-05-edit-client`. La lectura de la lista y
  la edición guardada van en PRs siguientes. El guardado del alta vive en `AddClientDialog`; se extrae
  a un hook compartido cuando la edición también guarde.
- **2026-09-15 — Una sola forma guardada por teléfono, por decisión de José Loría:** sin `+`, ocho
  dígitos son de Costa Rica y se guarda `+506` + dígitos; con `+`, se respetan los dígitos que trae
  (`validation/normalize-phone.ts`, `CLIENT_PHONE_FORMAT`). Es la base del criterio 3.
- **2026-09-15 — El teléfono único se revisa en código, no con restricción de base, por decisión de
  José Loría:** `isPhoneTaken` en `actions/clients-actions.ts` busca los últimos 8 dígitos en orden
  (`like '%8%8%8%8%7%7%7%7%'`) y confirma con `normalizePhone`, así atrapa también los teléfonos que
  `updateClientPhoneAction` de `auth` guarda sin normalizar. Sin migración. **Consecuencia asumida:**
  dos altas simultáneas con el mismo número pueden pasar ambas, porque la base no lo impide; y
  `idx_clients_profiles_phone` no sirve a un `like` con comodín inicial (lectura completa de la tabla).
- **2026-09-15 — La lectura de la lista entra en `feat/US-CLI-05-read-edit-clients`**, apilada sobre
  `feat/US-CLI-05-persist-clients`, y borra `constants/sample-clients.ts` (paga las dos deudas de
  `feat/US-CLI-05-edit-client`). Solo se lee la página 0: navegar páginas y filtrar es US-CLI-01. Las
  pruebas de componentes usan `__tests__/client-fixtures.ts`.
- **2026-09-15 — Datos de desarrollo en `supabase/seed.sql`, no en una migración:** 5 clientas sin
  cuenta, teléfono normalizado y verificado, idempotente por teléfono. Solo lo aplica
  `supabase db reset` en local; una migración llegaría a producción y contaría para INT-008.
- **2026-09-15 — La edición guardada entra en `feat/US-CLI-05-save-edit-client`.** El guardado de alta
  y edición se extrae a `hooks/useClientDialog.ts` (resuelve la duplicación del 2026-09-14). Editar no
  toca `phone_verified`. `updated_at` lo pone `updateClientAction` con `new Date()`: la tabla no tiene
  trigger y DOM-004 rige `domain/`, que esta feature no tiene (decisión del 2026-09-07).
- **2026-09-15 — SEC-002 queda como deuda aceptada por decisión de José Loría**, por el escape de
  proceso (`docs/spec/INTEGRATION.md#el-escape-legítimo`): el PR lleva la etiqueta `excepcion-proceso`
  y su justificación. Mismo camino que la deuda de `auth` del PR #3.
- **2026-09-15 — US-CLI-05 se marca `terminada` dentro del PR #32**, el último de la pila
  (#16 → #28 → #31 → #32), con esos PRs como evidencia (EST-005). La pila se mergea en orden: #32 no
  entra a `main` antes que los otros tres. La deuda de SEC-002 sigue abierta.
- **2026-09-15 — Los estilos se importan como `STYLES`, no como `s`** (decisión de revisión de código):
  `import { clientsListStyles as STYLES } from './ClientsList.styles'`. Aplicado a los 8 archivos de
  `clients` y de su ruta; `auth` y el resto de rutas se alinean cuando se toquen. Solo cambia el alias:
  ni los nombres de los objetos de estilos ni sus claves.
- **2026-09-15 — Las rutas de iconos SVG viven en `constants/clients-icons.ts`**, no dentro del JSX
  (mismo comentario de revisión). Hoy solo está el lápiz de `ClientsList`; no hay imágenes ni otros
  assets en la feature.
- **2026-09-16 — US-CLI-01 empieza en `us/US-CLI-01`, con piezas apiladas (INT-001, INT-002):**
  `feat/US-CLI-01-read-client-list` (lectura con parámetros y encabezado de la página), luego la tabla, la paginación y el filtro por nombre.
  El encabezado de `/admin/clients` se alinea con el de `/admin/dashboard`: dentro del `<main>` del layout de `admin`, sin un
  `<main>` propio anidado.
- **2026-09-16 — Morosidad y última cita son criterios diferidos:**
  el dato lo producen `delinquency` (US-MOR-01) y `scheduling` (US-AGE-05), sin tablas ni contrato hoy, y ARCH-005 prohíbe leer
  sus tablas. No se simulan con datos falsos (EST-005). Cuando existan, entran con su contrato (INT-003) y US-CLI-01 sigue
  `en_progreso` hasta entonces.
- **2026-09-16 — El filtro por nombre no lleva índice todavía (PERF-001 sobre PERF-003):** `ilike '%texto%'`
  no lo sirve un índice B-tree; el que sirve es GIN con `pg_trgm`, que es una migración. Con las clientas
  de hoy la lectura completa no se nota; se crea cuando una medición lo pida. Tampoco ignora tildes
  ("Maria" no encuentra "María"): eso pide `unaccent`, otra migración.
- **2026-09-20 — Las columnas de morosidad y última cita se dibujan desde ya, sin dato, por decisión de
  José Loría.** Matiza la decisión del 2026-09-16: la estructura de la tabla no espera a US-MOR-01 ni a
  US-AGE-05, pero el dato sigue sin inventarse (EST-005). Cada celda muestra el texto
  `CLIENTS_TABLE_TEXTS.pendingColumnValue` en cursiva y atenuado, no una celda en blanco, que se leería
  como "no debe nada" y como "nunca ha venido". Sus filtros no existen todavía. **Consecuencia asumida:**
  al llegar el dato hay que cambiar esas dos celdas y la prueba que hoy cuenta los textos pendientes.
- **2026-09-20 — El estado del listado vive en la URL (`?page`, `?pageSize`), no en el cliente.** La
  página lo lee y `listClientsAction` lo sanea, así que basta un enlace para cambiar de página: la
  lectura sigue ocurriendo en el servidor (PERF-002) y la pantalla se puede compartir o recargar sin
  perder dónde estaba. **Consecuencia asumida:** cambiar el tamaño de página necesita `router.push`,
  y eso obliga a que `ClientsPagination` sea un componente cliente.
- **2026-09-20 — El filtro por nombre se envía, no se busca al teclear.** Un `<form>` con su botón
  *Buscar*: cada pulsación sería una lectura a la base y una entrada en el historial del navegador.
  El campo lleva `key={name}`, para que al quitar el filtro React lo remonte y no conserve lo escrito.
- **2026-09-20 — La construcción de URLs del listado queda duplicada en `ClientsPagination` y
  `ClientsNameFilter`** (~5 líneas cada uno). Se extrae a un hook con una función pura por debajo
  ahora que existe el segundo consumidor; se pospone para no mezclar refactor y funcionalidad en la
  misma pieza (INT-002). **Costo:** 1h, incluye mover las pruebas de construcción de URL a la función pura.
- **2026-09-21 — Pagada la deuda anterior: `urls/clients-list-url.ts` (puro) y
  `hooks/useClientsListQuery.ts` (el que sabe de router).** El corte está donde está porque
  `usePathname`, `useSearchParams` y `useRouter` son hooks: compartir código que los llama obliga a
  que ese código sea un hook, pero las reglas de la consulta —que un nombre en blanco no filtra, que
  filtrar o cambiar el tamaño vuelve a la primera página— no necesitan React y se prueban mejor sin él.
  El hook expone `urlWith` (devuelve la URL, para un `<Link>` que navega solo) y `navigateWith` (la
  empuja, para el `<select>` y el formulario, que no tienen enlace que seguir). **Consecuencia asumida:**
  las pruebas de forma de URL viven en `clients-list-url.test.ts`; en los tests de componente queda
  solo que el control llegue al hook, no cómo se arma la cadena.
- **2026-09-20 — La columna de acciones lleva encabezado visible**, no `sr-only` como nació el
  2026-09-20 en esta misma pieza (decisión de José Loría). UI-004 se cumple igual: la columna tiene
  nombre accesible; ahora además se ve.
- **2026-09-23 — Se eliminaron los comentarios del código de la feature** (`src/features/clients/**` y
  `src/app/admin/clients/**`, pruebas incluidas), por indicación del profesor. Solo se borraron líneas;
  el comportamiento no cambia y las pruebas siguen pasando.
- **2026-10-04 — La feature pasa a las capas `domain/ application/ ui/`, por decisión de José Loría.**
  Revierte la decisión del 2026-09-07: `catalog` ya sigue `docs/spec/ARCHITECTURE.md` y `clients` era
  la feature distinta. Se movió con `git mv`, cambiando solo rutas de import; `index.ts` exporta los
  mismos nombres, así que `src/app/admin/clients/` no cambia (ARCH-003). Los componentes conservan un
  subdirectorio cada uno dentro de `ui/`: son 11 con hasta 4 archivos, y aplanarlos como `catalog`
  dejaría unos 40 archivos en una sola carpeta. Las pruebas no se mueven: la evidencia de US-CLI-05 las
  cita por nombre. Las decisiones anteriores nombran las rutas viejas (`actions/`, `validation/`,
  `hooks/`…) porque son bitácora. **Consecuencia:** `check-domain-purity.sh` vigila ahora `domain/` y
  `application/` de esta feature (DOM-004).
- **2026-10-04 — Las dependencias entre capas apuntan hacia adentro: `ui → application → domain`.**
  Los textos de validación pasan a `domain/client-validation-messages.ts` y `ui/messages.ts` los
  esparce dentro de `CLIENTS_ERROR_MESSAGES`, que conserva las mismas claves y textos; así
  `validateClientForm` no importa de `ui/`. `CLIENTS_LIST_LIMITS` pasa a
  `application/clients-list-limits.ts`: los tamaños de página son política del listado, no un
  límite de la clienta. `EMPTY_CLIENT_FORM_VALUES` y `CLIENT_FORM_LIMITS.notesRows` se quedan en
  `domain/client-form.ts` aunque solo los use el formulario: separarlos cambia la forma de constantes
  públicas sin ganar nada hoy.
- **2026-10-04 — `ui/actions.ts` se parte como en `catalog`: action delgada, caso de uso y repositorio.**
  La action solo exige la sesión, arma el repositorio, llama al caso de uso, traduce su código de
  error a un texto de `CLIENTS_ERROR_MESSAGES` y revalida. Los casos de uso de `application/` validan,
  normalizan, deciden el duplicado y sanean la página; devuelven `Result` con códigos
  (`'phone-taken'`, `'not-found'`…), no textos, para no depender de `ui/`. `db/client-repository.ts`
  es una función fábrica (ADR-0008) y guarda lo propio de Supabase: tabla, columnas, el patrón
  `like` de los dígitos en orden y el escape de comodines del `ilike`. El `new Date()` de `updated_at`
  vive ahí y no en `application/` (DOM-004). `SaveClientResult` y `ListClientsResult` llevan un texto
  para la pantalla, así que pasan a `ui/actions.types.ts`; `ListClientsQuery` es la entrada del caso de
  uso y pasa a `application/ports.ts`. Las pruebas de las actions no cambiaron y siguen pasando: la
  secuencia de llamadas a Supabase es la misma. **Consecuencia asumida:** `updateClientAction` con un id
  vacío crea el cliente de Supabase antes de rechazarlo, aunque no consulta la base.
- **2026-10-17 a 2026-10-19 — US-CLI-04 se entregó en 20 piezas (INT-002, INT-008), por decisión de
  José Loría.** Cada migración va en su propio PR: 1/20 el esquema (#369, base del stack) y 2/20 el
  bucket (#370, directo a `main`). El plan empezó en 8 piezas y se partió cada vez que una estimaba
  más de 400 líneas: dominio (3 contenido válido, 4 cambios), casos de uso (5 leer, 6 escribir),
  repositorio y adaptadores (7), server actions (8), vista (9), ficha con pestañas (10), estudio
  (11), antecedentes (12), imágenes (13 subir, 14 ver y cierre). 15 y 16 son mejoras visuales tras
  probarlo a mano; 17 a 20 atienden la auditoría del 2026-10-19. Crear categorías nuevas desde el
  menú salió del plan; si vuelve, es una pieza aparte.
- **2026-10-17 — El expediente es una cadena de versiones completas, append-only.** Cada cambio
  inserta una fila en `clients_record_versions` con el contenido entero; la vigente es la última.
  Sin políticas de UPDATE ni DELETE la base no deja reescribir el historial (criterio 4), igual que
  `audit_events`; "quitar" un antecedente es una versión nueva sin él. No hay tabla
  `clients_records`. Un índice único parcial impide dos registros iniciales por clienta y la FK
  compuesta `(previous_version_id, client_id)` impide continuar el expediente de otra.
- **2026-10-17 — Concurrencia por `UNIQUE (previous_version_id)`.** Una versión tiene una sola
  sucesora: si dos sesiones guardan sobre la misma, la segunda choca (`23505` → `version-conflict`)
  y la pantalla pide recargar, en vez de borrar sin saberlo lo que agregó la primera.
- **2026-10-17 — Antecedentes e imágenes en `jsonb` dentro de la versión.** Guardar es un solo
  `INSERT`. Desde la auditoría (M5), dos `CHECK` exigen la forma de cada antecedente (`id`,
  `categoryId`, `categoryName`, `description`) y que cada imagen esté en la carpeta de su clienta.
  No hay FK a la categoría: cada antecedente guarda una copia de su nombre, que es lo que muestra el
  historial.
- **2026-10-17 — Las categorías son una tabla, no un `CHECK`, por decisión de José Loría.** La
  migración trae Alergia, Sensibilidad y Condición relevante (criterio 2), que deben existir en
  producción. Únicas sin importar mayúsculas; no se renombran ni se borran porque el historial las
  cita.
- **2026-10-17 — La técnica recomendada se elige de `catalog` por su API pública** (sin FK,
  ARCH-005), con copia del nombre. Una técnica nueva tiene que estar activa; la vigente se conserva
  aunque se haya desactivado.
- **2026-10-17 — Opción A para "actualizar con cada cita posterior":** cada versión lleva fecha y
  autora, sin vínculo a una cita. Vincular a una cita es US-CLI-03 (anotaciones), que depende de
  US-CLI-02 y US-AGE-05; si hace falta, se agrega `appointment_id` con una migración forward. El
  expediente es el estado clínico vigente; las anotaciones, lo que pasó en cada cita. Un dato
  clínico escrito en una anotación o en `clients_profiles.notes` queda fuera de SEC-006.
- **2026-10-17 — Solo la administradora (`auth_is_admin()`), no `auth_is_staff()`** (SEC-006). El
  INSERT exige `created_by = auth.uid()`. `client_id` es `ON DELETE RESTRICT` (ADR-0009).
- **2026-10-17 — Bucket `clients-record-images` privado, 1 MB, solo JPEG, PNG y WebP (#370).** Solo
  la administradora lee y sube, dentro de la carpeta de una clienta que existe; sin UPDATE ni DELETE.
- **2026-10-17 — Dominio en `domain/record/`.** `buildRecordContent` es la única forma de crear un
  contenido válido: recorta, aplica los topes de la base (`RECORD_LIMITS`) y lleva una marca
  `unique symbol`. Se llamó `RecordSnapshot` hasta el 2026-10-18; se renombró a `RecordContent`
  dentro de cada pieza, por decisión de José Loría, porque "contenido" se lee solo. Los cambios
  (`createInitialRecord`, `addPrecaution`, `removePrecaution`, `editStudy`, `addImage`) devuelven
  `{ changeKind, content }` y vuelven a pasar por `buildRecordContent`. Los problemas son códigos,
  no textos: la UI los traduce (DOM-009). Cada antecedente lleva su `id`; uno repetido se rechaza.
  Editar sin cambiar nada devuelve `RecordUnchanged`.
- **2026-10-17 — La aplicación habla con el exterior solo por puertos** (`record-ports.ts`).
  Leer audita primero, fail-closed: si la bitácora falla, no hay datos. El evento lleva actor,
  acción y clienta, nunca el contenido. El expediente vive en su propia pestaña para que el acceso
  sea deliberado. El historial se lee con tope (`RECORD_HISTORY_LIMIT` = 50, PERF-002); la fecha del
  registro inicial se lee aparte (`findInitialVersion`, B5) para que no se pierda pasando ese tope.
- **2026-10-17 — Escribir guarda y después audita.** Cada versión se encadena a la vigente con
  autora y fecha del reloj inyectado (DOM-004). Si la bitácora falla después de guardar, el código
  es `saved-without-audit`: la pantalla avisa y refresca, porque el cambio sí quedó (deuda M2).
- **2026-10-18 — Repositorio en `db/record/`, función fábrica (ADR-0008).** Al leer, cada fila vuelve
  a pasar por `buildRecordContent`; una fila mal formada lanza en vez de mostrar un expediente a
  medias (B4, aceptado). Otro error de la base se lanza (DOM-006). Los adaptadores a `audit` y
  `catalog` viven en `http/record/record-gateways.ts` (B2; antes en `application/`) y usan solo sus
  APIs públicas (ARCH-003); el de la bitácora convierte un rechazo o un error en `false`.
- **2026-10-18 — Server actions solo para escribir; lecturas en `ui/admin-record/queries/` (M6).**
  Cada una exige `requireAdminSession()` y firma con esa sesión (SEC-005). Los ids se revisan con
  forma de UUID antes de tocar la base y el de clienta se normaliza a minúsculas. No lanzan: un fallo
  inesperado responde "No se pudo guardar" (M1). Devuelven datos planos (`RecordVersionView`) y cada
  código se traduce en `record-strings.ts`. `readRecord` comprueba que la clienta exista antes de
  auditar; una inexistente va a `notFound()`. **Qué cuenta como acceso:** cada carga de los datos,
  incluido el refresco tras guardar. `error.tsx` importa de `@/features/clients/client`.
- **2026-10-18 — Ficha en `src/app/admin/clients/[id]/`.** Volver, nombre, teléfono y la pestaña
  Expediente (`aria-current`); alineada a la izquierda con ancho máximo. Estados (UI-003): vacío,
  `loading.tsx`, `RecordLoadError` con *Reintentar* y `error.tsx`. `describeVersion` nombra el
  antecedente agregado o quitado comparando con la versión anterior. Fechas en `STUDIO_TIME_ZONE`.
- **2026-10-18 — Estudio y antecedentes.** `StudyForm` va en línea, no en modal; el menú muestra
  técnicas activas (tope 100) más la vigente. Si `catalog` falla, queda "Sin técnica recomendada".
  Antecedentes en una tarjeta por categoría con su conteo (`groupPrecautions`) e íconos SVG propios;
  *Quitar* nombra su antecedente (UI-004) y confirma con `ConfirmDialog`.
- **2026-10-18 — Imágenes.** Tope de 1.000.000 bytes, debajo del límite de 1 MB del cuerpo de las
  server actions (A1); la pantalla valida tamaño y tipo antes de enviar y el servidor lee el tipo de
  la firma real del archivo (B9). El cupo de 20 se revisa antes de subir y, lleno, desaparece
  "Agregar foto" (M4). Se suben a `<clienta>/<uuid>.<ext>` y se ven con URLs firmadas de 5 minutos
  (`RECORD_IMAGE_URL_SECONDS`, por decisión de José Loría); si una vence, pide recargar (B6). Mosaicos
  con `ImageViewer` (flechas, Escape, devuelve el foco).
- **2026-10-19 — Imports con `@/` y piezas compartidas en `ui/shared/` (B1).** `ConfirmDialog` y
  `useFocusTrap` los usan `admin-clients` y `admin-record`.
- **2026-10-21 — Alcance de US-CLI-02, aprobado por el PO y comunicado por José Loría.** Tres puntos
  del criterio 1 y del 3, registrados en `docs/process/DEPENDENCIES.md`:
  1. *Las anotaciones* se trasladan a US-CLI-03 (ítem 8 de «Criterios trasladados»): las crea esa
     historia, que depende de esta, así que dejarlas aquí sería un ciclo. El criterio 2 de US-CLI-03
     ya pide verlas dentro del historial. CLI-02 dibuja la columna **Anotaciones** con
     `pendingColumnValue`, como las columnas diferidas de US-CLI-01.
  2. *El estado de pago* de cada cita es el estado del anticipo: sin anticipo, pendiente o
     registrado, desde `depositRequired` y `depositRegistered`, que la cita congeló al reservar
     (DOM-002). Con eso el criterio se cumple. El pago completo de la cita ("pagada", "con saldo")
     necesita el libro contable de US-AGE-12; si se pide después, entra con su propio contrato y el
     `id` de cada cita, sin cambiar la forma de `scheduling-api.md`.
  3. *El acceso desde la vista diaria* es un criterio diferido hasta US-AGE-11 (ítem 5 de «Criterios
     diferidos»): no hay ciclo, porque US-AGE-11 no depende de esta historia. CLI-02 exporta la ruta de
     la pestaña en `index.ts` para que la vista diaria enlace a ella. **Consecuencia asumida:** CLI-02
     queda `en_progreso` hasta que exista US-AGE-11, y US-CLI-03 y US-LAND-06, que dependen de ella, no
     se pueden empezar hasta entonces (INT-007).
- **2026-10-21 — US-CLI-02 lee las citas por un caso de uso público de `scheduling`, sin migración.**
  ARCH-005 prohíbe leer `scheduling_appointments` desde `clients`, así que `scheduling` expone
  `listClientAppointments` (contrato en `docs/contracts/scheduling-api.md`, INT-003). Se descartó una
  función SQL como las de `clients-api.md`: aquella existe porque la clienta llama por PostgREST, y el
  historial lo lee una página del panel en el servidor. La base ya tiene lo necesario: las columnas de
  US-AGE-05, el índice `(client_id, starts_at)` para el orden y la política
  `scheduling_appointments_select_staff`. **Consecuencia asumida:** esa política es de personal
  (`auth_is_staff()`), no solo de la administradora; el historial no es dato sensible (SEC-006 rige el
  expediente) y la página exige `requireAdminSession()`.
- **2026-10-21 — US-CLI-02 se entrega en 5 piezas apiladas sobre `main` (INT-002) y un cierre aparte,
  por decisión de José Loría.** 1/5 el contrato y estos registros (solo documentación); 2/5
  `listClientAppointments` en `scheduling` con sus pruebas; 3/5 dominio, caso de uso, adaptador en
  `http/` y lectura en `ui/admin-history/queries/`; 4/5 la ruta `src/app/admin/clients/[id]/citas/`, la
  pestaña **Citas** y la tabla con sus tres estados (UI-003); 5/5 la paginación en la URL y el enlace
  desde cada fila del listado. La 5/5 deja la historia `en_progreso` por el criterio diferido. El cierre
  no cuenta como pieza: es el PR `us/US-CLI-02` → `main`, con título `(US-CLI-02)`, cuando US-AGE-11
  enlace al historial, y trae la `evidencia:` y `terminada` (EST-007). Si una pieza estima más de 400
  líneas, se parte antes de escribirla y se retitulan todas.
- **2026-10-22 — `RecordLoadError` pasa a `ui/shared/components/LoadError`, por decisión de José
  Loría.** El expediente y el historial muestran el mismo aviso con *Reintentar*; lo que comparten dos
  áreas va a `ui/shared/` (lección de US-CLI-04). Como `ConfirmDialog`, no trae textos: recibe
  `retryLabel` y cada área pasa el suyo (`RECORD_LABELS.retry`, `HISTORY_LABELS.retry`, DOM-009).
- **2026-10-31 — US-CLI-02 se cierra con una prueba propia del enlace desde la agenda, por decisión
  de José Loría.** US-AGE-11 (#621) ya pinta «Ver sus citas», pero su prueba usa un `ClientLinks`
  escrito a mano, como debe para no depender de `clients`. Lo que une las dos features es la ruta
  `src/app/admin/citas/agenda/page.tsx`, y no tenía prueba: cambiar la ruta de la pestaña o pasar
  `clientRecordPath` en los dos enlaces no rompía nada. `page.test.tsx` compara el enlace con
  `clientAppointmentsPath` real. Se descartó cerrar solo con la prueba de la agenda (EST-005: el
  criterio necesita una prueba que falle si se rompe). El PR `us/US-CLI-02` → `main` no cambia código
  de producción y deja la historia `terminada` (EST-007).

## Contrato para scheduling (US-AGE-05)

`scheduling` necesita saber cuál es el perfil de la clienta de la sesión y mostrar de quién es cada cita pendiente. Antes lo hacía leyendo `clients_profiles` directo, lo que incumplía ARCH-005 y acoplaba la reserva al modelo de perfiles (hallazgo M2 de la auditoría de US-AGE-05). Acordado con José Loría el 2026-10-19: el contrato vive en `docs/contracts/clients-api.md`.

- Migración `20261019000008_clients_contract_fns.sql` con dos funciones `SECURITY INVOKER` solo para `authenticated`: `clients_current_profile_id()` (el perfil de la sesión, nulo si no tiene) y `clients_display_names(uuid[])` (nombre de cada perfil que la RLS deja ver). Pruebas: pgTAP `clients_contract.test.sql`.
- No hay código TypeScript nuevo en `clients`: el contrato es SQL. Las tablas del expediente (`clients_record_versions` y las demás) no se tocan ni se comparten.
- La llave foránea `scheduling_appointments.client_id → clients_profiles(id)` (`ON DELETE RESTRICT`) queda registrada en el anexo del ADR-0009. Cambiar `clients_profiles.id` exige coordinar con `scheduling`.
- Esto no reabre US-CLI-04 ni cambia su estado.
