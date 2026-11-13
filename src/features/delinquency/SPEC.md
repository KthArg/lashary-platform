---
feature: delinquency
dri: pendiente
estado: en_progreso
actualizado: 2026-11-08
historias:
  - id: US-MOR-01
    estado: terminada
    evidencia: "PR de cierre us/US-MOR-01 a main, con 24 piezas apiladas contra la rama de la historia (#765 a #784 y #789 a #792; las piezas 21 a 24 son correcciones de la revisión de la pila). Criterio 1 (detección de las citas cerradas con pago sin registrar): supabase/tests/database/delinquency_detect_unpaid.test.sql y payments_unpaid_charges.test.sql; el cron, en delinquency/http/__tests__/cron-handler.test.ts, application/__tests__/detect-unpaid.test.ts y db/__tests__/detection-repository.test.ts; comprobado a mano en local con el servidor real: el cron genera 3 morosidades por revisar y una segunda corrida genera 0. Criterio 2 (periodo de gracia configurable, de 1 a 90 días y 7 por defecto): delinquency_tables.test.sql, delinquency_set_grace_days.test.sql, application/__tests__/grace-days.test.ts, db/__tests__/settings-repository.test.ts, ui/review/__tests__/review-actions.test.ts y review-view.test.tsx; comprobado a mano en el navegador: guarda 14, deja el evento con el valor anterior y el nuevo y persiste al recargar. Criterio 3 (aviso previo con opción de confirmar o descartar): delinquency_decide_case.test.sql, delinquency_notify_case_detected.test.sql, application/__tests__/decide-case.test.ts, db/__tests__/case-repository.test.ts, ui/review/__tests__/review-view.test.tsx y, en notifications, ui/inbox/__tests__/notice-lines.test.ts, admin-inbox.test.tsx y db/__tests__/inbox-repository.test.ts; comprobado a mano: la administradora ve el aviso en Notificaciones y su enlace lleva a /admin/morosidades. Criterio 4 (el saldo se calcula sumando los asientos, no se guarda a mano): payments_unpaid_charges.test.sql, una cita entra si la suma de todos sus asientos es mayor que cero; la morosidad guarda el saldo que tenía al detectarla y ninguna función lo actualiza. Criterio 5 (estado en el expediente y listado de activas): delinquency_contract.test.sql, delinquency_list_active_cursor.test.sql (el cursor por fecha y clienta no se salta empates), db/__tests__/case-list-repository.test.ts, application/__tests__/load-review.test.ts (avisa cuando hay más de 50), y en clients application/__tests__/list-clients-delinquency.test.ts, ui/admin-clients/__tests__/clients-list-delinquency.test.tsx, get-client-action.test.ts y el layout.test.tsx del perfil. Pasa a US-MOR-03: qué cuenta como pago registrado (ítem 14 de «Criterios trasladados»). Decisiones del PO del 2026-11-08 en docs/process/DEPENDENCIES.md. El cron no está programado: .github/workflows/delinquency-detect.yml solo tiene workflow_dispatch y el schedule se agrega cuando US-MOR-03 esté mergeada y Kenny lo confirme."
  - id: US-MOR-02
    estado: en_progreso
    falta: "casi toda: solo existe el arranque en docs (2026-11-06), apilado sobre US-MOR-01 que todavía no es terminada; con las decisiones del PO del 2026-11-08; pendiente fijar el mínimo de caracteres del motivo de la excepción (sección US-MOR-02, «Decisiones del PO»)"
  - id: US-MOR-03
    estado: no_iniciada
  - id: US-MOR-04
    estado: no_iniciada
  - id: US-MOR-05
    estado: no_iniciada
flags: []
deuda:
  - que: "La morosidad no se cierra ni actualiza su monto cuando se paga: delinquency_cases.pending es una foto del saldo al detectar y ninguna función la vuelve a leer. Una clienta que paga después de confirmada la morosidad sigue figurando activa con el monto viejo hasta que alguien la descarte a mano"
    aceptada_en: "Revisión de la pila de US-MOR-01 (PR #765 a #784), 2026-11-11, hallazgo medio no bloqueante; el PO decidió que qué cuenta como pago registrado es de US-MOR-03 (ítem 14 de «Criterios trasladados»)"
    costo: "Dueño: US-MOR-03 (registro de pago), con US-MOR-02 para el desbloqueo. Aprox. 1 día: un estado de cierre en delinquency_cases, una función SQL que cierre o actualice el caso en la misma transacción que asienta el pago (DOM-005) y su pgTAP"
  - que: "Un aviso a la bandeja por cada morosidad detectada, sin resumen por corrida: la primera corrida sobre un ledger con muchas citas impagas puede poner decenas de avisos de golpe (la bandeja pagina de 20 en 20)"
    aceptada_en: "Revisión de la pila de US-MOR-01 (PR #765 a #784), 2026-11-11, hallazgo medio no bloqueante; el riesgo ya estaba anotado en la sección «Aviso en la bandeja»"
    costo: "Dueño: Jose Lorenzo (delinquency) con notifications. Aprox. 3 h: un aviso resumen por corrida («N morosidades por revisar») en lugar del trigger por fila, o un tope de avisos por corrida, y sus pgTAP. Conviene hacerlo antes de programar el cron"
  - que: "El cron de detección usa la misma cuenta de sistema que el cron de recordatorios (NOTIFICATIONS_CRON_EMAIL y NOTIFICATIONS_CRON_PASSWORD): una sola credencial con permisos de staff para dos tareas, y rotarla o revocarla para una afecta a la otra"
    aceptada_en: "Revisión de la pila de US-MOR-01 (PR #765 a #784), 2026-11-11, hallazgo medio no bloqueante; la reutilización de la cuenta existente está anotada en CI_SECRETS.md"
    costo: "Dueño: Jose Lorenzo con Kenneth (secretos de CI). Aprox. 4 h: una cuenta de sistema por cron, o un rol de base con solo EXECUTE de las funciones del cron, más su alta en CI_SECRETS.md y en el entorno. Antes de programar el schedule"
  - que: "payments_unpaid_charges agrupa todo el ledger en cada página (GROUP BY de payments_ledger_entries por clienta y cita): el corte de fecha y el saldo se aplican después de agrupar, así que ningún índice lo acota y el costo de una corrida crece con el ledger entero, no con lo nuevo (PERF-002)"
    aceptada_en: "Revisión de la pila de US-MOR-01 (PR #765 a #784), 2026-11-11, hallazgo medio no bloqueante; sin medición todavía, PERF-001 pide medir antes de optimizar"
    costo: "Dueño: Jose Lorenzo, a revisar cuando US-MOR-03 empiece a llenar el ledger. Aprox. 4 h: medir con el volumen real (EXPLAIN) y, si hace falta, un índice parcial por (appointment_id) de los cargos o limitar la ventana de cierre, con su pgTAP"
defectos: []
---

# delinquency

Morosidad: deteccion con gracia y aviso previo (DOM-012), bloqueo, regularizacion, override auditado.

## Qué hace hoy

Hoy: las tablas de morosidades y de configuración, las funciones que detectan, confirman o descartan y cambian la gracia, y las del contrato (sección de US-MOR-01). La pantalla de revisión y el reflejo en `clients` existen y hay una ruta de cron para correr la detección, sin programar y cada morosidad por revisar deja un aviso en la bandeja de la administradora.

## Contrato público

El contrato de lo que `delinquency` ofrecerá a `clients` está en [delinquency-api.md](../../../docs/contracts/delinquency-api.md): `delinquency_client_states` y `delinquency_list_active`, con los estados `pending_review`, `active` y `dismissed`. Todavía no hay implementación. El código entra por `index.ts` (ARCH-003).

Lo que `delinquency` necesita de `payments` está en [payments-api.md](../../../docs/contracts/payments-api.md): `payments_client_balance` y `payments_unpaid_charges`.

## US-MOR-01: detección automática de pagos pendientes

Criterios del backlog:

1. El sistema identifica citas cerradas cuyo pago quedó sin registrar y genera una morosidad asociada a la clienta.
2. Existe un periodo de gracia configurable entre el cierre de la cita y la generación de la morosidad.
3. Antes de que una morosidad pase a activa, la administradora recibe un aviso de qué clientas están por quedar
   bloqueadas, con opción de confirmar o descartar.
4. El saldo de la clienta se calcula sumando cargos y pagos registrados; no se guarda como un valor que se
   actualiza a mano.
5. El estado de morosidad se refleja en el expediente y la administradora ve el listado de morosidades activas.

Depende de US-AGE-12 (`terminada`). Reglas: DOM-005 (ledger append-only, saldo derivado), DOM-012 (consecuencias
automáticas aprobadas por el PO), DOM-003 (hora del estudio), ARCH-003/004/005 (fronteras entre features),
SEC-002 y SEC-006 (RLS con su test de aislamiento, datos de la clienta), INT-003 (contratos) y PERF-002 (listados
con tope).

### Lo que ya existe

- El ledger de `payments` (`payments_ledger_entries`, US-AGE-12): asientos `charge` (positivo) y `deposit_credit`
  (negativo), uno por cita y tipo, y `payments_client_balance(cliente)`, que devuelve la suma de los asientos. El
  saldo del criterio 4 ya se deriva así; esta historia lo reusa, no lo reemplaza.
- Todavía no hay un asiento de pago: el registro de pago con comprobante lo porta US-MOR-03. Por eso, hoy toda cita
  cerrada con cargo tiene saldo pendiente.
- `scheduling` ya consume un puerto de morosidad al reservar (`DelinquencyPort`); la regla que lo alimenta es de
  US-MOR-02, que hereda de US-AGE-05 y US-AGE-11 los criterios de bloqueo e indicador.

### Decisiones del PO (DOM-012, Kenny, 2026-11-08)

Comunicadas por Jose Lorenzo; el registro está en `docs/process/DEPENDENCIES.md`.

- **Gracia:** 7 días por defecto, configurable de 1 a 90. El cambio rige solo para las detecciones nuevas.
- **Aviso previo:** la morosidad detectada queda por revisar y la administradora la confirma o la descarta. Texto de la
  pantalla: «Pago sin registrar pasado el plazo de gracia. Confirme si la morosidad procede o descártela si la clienta sí
  pagó.» Una descartada no se vuelve a generar por la misma cita.
- **Pago registrado:** qué cuenta como pago registrado se traslada a US-MOR-03 (ítem 14 de «Criterios trasladados»).
  No hay bandera de encendido: la detección lee el ledger y funciona sola cuando US-MOR-03 registre pagos.
- **Cron:** no se programa todavía (ver «Cron de detección»).
- **Orden de las historias.** El override manual auditado y levantar o perdonar son de US-MOR-05; esta historia solo
  deja la morosidad en un estado que ese override pueda cambiar.

### Tablas y configuración (pieza 4)

- Migración `20261108000001_delinquency_tables.sql`. `delinquency_settings` es una tabla de una sola fila con
  `grace_days` (de 1 a 90, arranca en 7, aprobado por el PO el 2026-11-08). Staff la lee y nadie la escribe directo: la administradora la
  cambia por la función `delinquency_set_grace_days` (pieza 17), que deja bitácora. Cambiar la gracia rige solo para las detecciones nuevas: no toca las morosidades ya generadas. No hay
  bandera de encendido (decisión del PO): la detección lee el ledger y funciona sola cuando US-MOR-03 registre pagos.
- `delinquency_cases`: una morosidad por cita (`UNIQUE appointment_id`, así una descartada no se vuelve a generar),
  con `client_id`, el saldo `pending` al detectarla, el `state` (`pending_review`, `active` o `dismissed`) y quién
  y cuándo la decidió. El CHECK obliga a que una morosidad por revisar no traiga decisión y que una activa o
  descartada sí la traiga. `appointment_id` no tiene FK (ARCH-005). Staff solo lee: las morosidades las escriben las
  funciones de las piezas siguientes.
- Prueba: pgTAP `delinquency_tables.test.sql` (la gracia nace en 7 días y nadie la cambia directo,
  ni la administradora; una morosidad por cita; estado y decisión van juntos; staff no inserta directo; la
  clienta no ve ni cambia nada y `anon` no tiene permiso).

### Detección (pieza 5)

- Migración `20261108000002_delinquency_detect_fn.sql`: `delinquency_detect_unpaid()` (`SECURITY DEFINER`, solo
  staff; la clienta y `anon` reciben `42501`). Pide a `payments` las citas cerradas con saldo pendiente al corte `ahora - grace_days` y deja
  una morosidad `pending_review` por cada una, con la clienta y lo que debe; devuelve cuántas generó. No activa
  nada: la revisión es de la administradora (DOM-012).
- Idempotente: `ON CONFLICT (appointment_id) DO NOTHING`, así una cita con morosidad, incluso descartada, no se
  regenera. Lee el ledger por el contrato `payments_unpaid_charges`, no la tabla (ARCH-005), y recorre la lista por
  cursor, de a 200 con un máximo de 50 páginas por corrida, para que las morosidades ya existentes, que siguen
  impagas, no tapen a las citas nuevas (PERF-002).
- Prueba: pgTAP `delinquency_detect_unpaid.test.sql` (genera una por cita impaga pasada
  la gracia, asociada a la clienta; no toca las de dentro de la gracia ni las pagadas; correrla dos veces no duplica;
  una descartada no vuelve; al bajar la gracia entra la de 3 días; una cita nueva se detecta detrás de 210
  morosidades que llenan más de una página; la clienta y `anon` no la corren).
- Todavía nadie la llama: el cron que la corre llega con la pieza que cablea la aplicación.

### Confirmar y descartar (piezas 6 y 7)

- Migración `20261108000003_delinquency_decide_case_fn.sql`: `delinquency_decide_case(morosidad, decisión)`
  (`SECURITY DEFINER`, solo admin; la clienta y `anon` reciben `42501`). `confirm` deja la morosidad `active` y
  `dismiss` la deja `dismissed`, con quién y cuándo decidió. Solo se decide una morosidad `pending_review`: una ya
  decidida es el error `delinquency_case_already_decided` y una inexistente `delinquency_case_not_found`. El
  evento `delinquency.case.confirmed` o `delinquency.case.dismissed` queda en `audit_events` en la misma
  transacción (DOM-011). Prueba: pgTAP `delinquency_decide_case.test.sql`.
- Dominio (pieza 6): `domain/delinquency-case.ts` (estados y decisiones) y `domain/errors.ts` (errores con guarda de tipo, DOM-006).
- App (pieza 7): `application/decide-case.ts` sobre el puerto `CaseRepository` y `db/case-repository.ts`, que llama a la
  función de la base, traduce `P0002` y `55000` a «no existe» y «ya se decidió», y valida la fila con Zod. La
  acción `decideCaseAction` (`ui/review/actions/`) exige sesión de administradora, valida con Zod y refresca la
  pantalla. Pruebas: `application/__tests__/decide-case.test.ts`, `db/__tests__/case-repository.test.ts` y
  `ui/review/__tests__/review-actions.test.ts`.
- Todavía no hay pantalla que la llame: llega en una pieza siguiente.

### Funciones del contrato (pieza 8)

- Migración `20261108000004_delinquency_contract_fns.sql`: `delinquency_client_states(ids)` y
  `delinquency_list_active(tope, después_de)` (la pieza 21 cambia su cursor), las dos del contrato [delinquency-api.md](../../../docs/contracts/delinquency-api.md).
  Son de solo lectura y `SECURITY INVOKER`: la RLS deja ver las filas solo a staff. El estado de una clienta es el
  más relevante: `active` gana a `pending_review` y `dismissed` no se devuelve; el saldo es el de las morosidades de ese
  estado. Más de 200 ids es el error `delinquency_too_many_ids`. El listado de activas va de la más reciente a la más
  antigua, con tope de 100 y paginado por fecha.
- Prueba: pgTAP `delinquency_contract.test.sql` (la activa gana, el saldo se suma por estado, la descartada no sale, el
  tope de ids, el orden y la paginación del listado, y la clienta y `anon` no ven nada).
- Todavía nadie las llama: las consumen la pantalla y `clients` en las piezas siguientes.

### Pantalla de morosidades (piezas 9 a 11)

- Ruta `/admin/morosidades` (`src/app/admin/morosidades/`, con `loading.tsx` y `error.tsx`), solo para administradora, con un
  ítem «Morosidades» en el menú (`auth`, `ADMIN_PORTAL_ROUTES.delinquency`). Muestra dos secciones: **Por revisar**, con lo
  que debe cada clienta y los botones «Confirmar morosidad» y «Descartar», y **Morosidades activas**, con lo que debe y desde
  cuándo. Cada lista tiene tope de 50 (PERF-002); las por revisar van de la más antigua a la más reciente, para decidir primero
  las que llevan más tiempo.
- App: `application/load-review.ts` arma la vista con `CaseListRepository` (`db/case-list-repository.ts`, que lee la tabla
  propia y `delinquency_list_active`) y `ClientNamesPort` (`db/client-names.ts`, que pide el nombre a `clients_display_names`,
  ARCH-005, una sola llamada con las clientas sin repetir). Una clienta sin nombre visible se muestra como «Clienta sin
  nombre». `ui/review/components/CaseDecisionButtons.tsx` llama a `decideCaseAction`, deshabilita los botones mientras guarda y
  muestra el resultado o el motivo del error junto a esa morosidad.
- Estados (UI-003): vacío por sección, carga (`ReviewLoading`) y error con reintento (`ReviewError` y el aviso de lectura).
  Los montos usan `formatMoney` y las fechas `formatStudioDateTime` (DOM-003).
- Pruebas: `application/__tests__/load-review.test.ts`, `db/__tests__/case-list-repository.test.ts` y
  `ui/review/__tests__/review-view.test.tsx` (listas, monto en colones, nombre por defecto, vacío, error y carga, y los botones
  con éxito y con fallo).
- Todavía no refleja la morosidad en el listado ni el expediente de `clients`, ni avisa en la bandeja: piezas siguientes.

### Morosidad en `clients` (piezas 12 y 13)

- `clients` consume el contrato (`delinquency_client_states`) para la columna «Morosidad» del listado y el encabezado del perfil de
  la clienta, que cubre el reflejo en el expediente del criterio 5. La implementación y sus pruebas están en el SPEC de `clients`
  («Morosidad en el listado y en el perfil»). Si esta feature no responde, `clients` sigue funcionando y muestra «Sin dato».

### Cron de detección (pieza 14)

- Ruta `POST /api/cron/delinquency-detect` (`src/app/api/cron/delinquency-detect/route.ts`). Exige `Authorization: Bearer <CRON_SECRET>` (comparación en tiempo constante, `shared/lib/cron-auth.ts`, que el cron de recordatorios de `notifications` ahora también usa); sin el secreto responde 401 y no toca la base.
- Entra con la misma cuenta de sistema del cron de recordatorios (`NOTIFICATIONS_CRON_EMAIL` y `NOTIFICATIONS_CRON_PASSWORD`, staff): `delinquency_detect_unpaid()` exige staff y no hay otro camino sin sesión. No usa la service-role key (SEC-003/004). No hay variables nuevas.
- Llama a `delinquency_detect_unpaid()` y responde `{ "generated": n }`. No hay bandera de encendido (decisión del PO): corre el ledger y deja lo que corresponde; con nada impago o nada nuevo, `generated` es 0. El cron nunca activa una morosidad: solo deja `pending_review` (DOM-012).
- Fallos: sin cuenta de sistema configurada o si no puede entrar, 503 con ese motivo; si la base falla, 503 con `storage-failed` sin filtrar el mensaje; una excepción inesperada, 500. En todos los casos cierra la sesión de sistema.
- **No está programado.** El repo no tiene programación de crons de la app. Decisión del PO (Kenny, 2026-11-08): `.github/workflows/delinquency-detect.yml` existe con solo `workflow_dispatch`, llama a la ruta con el `CRON_SECRET` como Bearer (secretos `APP_BASE_URL` y `CRON_SECRET`, ver `docs/process/CI_SECRETS.md`), y una corrida diaria basta. **Se activa agregando el `schedule` (ya escrito como comentario en el workflow) cuando US-MOR-03 esté mergeada y Kenny lo confirme**, porque hasta que se puedan registrar pagos toda cita cerrada con cargo parece impaga. Lo programa Jose o Kenneth si lo bloquea. Hasta entonces la detección no corre sola.
- Capas: `application/detect-unpaid.ts` sobre el puerto `DetectionRepository`, `db/detection-repository.ts` (valida que la respuesta sea un entero no negativo) y `http/cron-handler.ts`. Pruebas: `application/__tests__/detect-unpaid.test.ts`, `db/__tests__/detection-repository.test.ts`, `http/__tests__/cron-handler.test.ts` y `shared/lib/__tests__/cron-auth.test.ts`.
- Comprobado a mano en local, de punta a punta con el servidor real: sin secreto y con secreto equivocado, 401; con el secreto correcto y tres citas impagas pasada la gracia, `generated: 3` y tres morosidades `pending_review`; una segunda corrida, `generated: 0`; ninguna quedó `active`.

### Aviso en la bandeja (piezas 15 y 16)

- Contrato: [delinquency-api.md](../../../docs/contracts/delinquency-api.md), «Aviso a la bandeja de la administradora». Migración
  `20261108000005_delinquency_review_notice.sql` (INT-008, una sola): el trigger `delinquency_cases_notify_detected` llama, al insertarse
  una morosidad `pending_review`, a `notifications_record_delinquency_review`. Un aviso por morosidad; una que nace activa no avisa; un
  fallo al registrar el aviso no bloquea la morosidad (queda en el log, igual que en `scheduling`).
- La bandeja nació para avisos de una cita; el de morosidad lleva lo que debe la clienta. `notifications_admin_inbox` suma
  `pending_amount`, `service_name` y `starts_at` pasan a ser opcionales y la combinación válida de columnas queda fijada por tipo
  (restricción `notifications_admin_inbox_fields_by_kind`).
- Prueba: pgTAP `delinquency_notify_case_detected.test.sql` (el aviso con la clienta y lo que debe, una activa no avisa, la detección
  real deja uno por morosidad y una segunda corrida no repite, la clienta no ve ni registra, un fallo del aviso no bloquea y la tabla
  exige las columnas de cada tipo).
- Pieza 15: la base de datos. Pieza 16: `notifications` dibuja el aviso en la bandeja de la administradora («{clienta} tiene un pago sin
  registrar por revisar», lo que debe y un enlace a `/admin/morosidades`); el detalle está en el SPEC de `notifications`.
- Comprobado a mano en local, con el servidor real y un navegador: el cron genera 3 morosidades y deja 3 avisos; la segunda corrida no repite; la administradora ve «3 sin leer» en Notificaciones, cada aviso con la clienta y lo que debe, y el enlace «Revisar morosidades» cierra el panel y lleva a `/admin/morosidades`, donde están las 3 por revisar.
- **Volumen conocido:** como hay un aviso por morosidad, la primera corrida con pagos reales (cuando US-MOR-03 exista) puede dejar muchos
  de una vez. La bandeja pagina de 20 en 20; si se vuelve un problema, un aviso resumen por corrida es un cambio posterior.

### Periodo de gracia configurable (piezas 17 a 19)

- Criterio 2: la administradora cambia el periodo de gracia, de 1 a 90 días (aprobado por el PO, 2026-11-08); rige solo para las
  detecciones nuevas y no toca las morosidades ya generadas. La tabla `delinquency_settings` no se escribe directo, ni siquiera la
  administradora: la única vía es la función de esta pieza.
- Migración `20261108000006_delinquency_set_grace_days_fn.sql`: `delinquency_set_grace_days(días)` (`SECURITY DEFINER`, solo admin; la
  clienta y `anon` reciben `42501`). Fuera de 1 a 90 es `22023`. Cada cambio deja el evento `delinquency.settings.grace_days_changed`
  en `audit_events`, en la misma transacción, con el valor anterior y el nuevo (DOM-011); poner el mismo valor no cambia nada ni deja
  evento. Devuelve el valor que quedó.
- Prueba: pgTAP `delinquency_set_grace_days.test.sql` (cambia y devuelve el valor, deja el evento con quién, anterior y nuevo, el mismo
  valor no deja evento, los límites 1 y 90 y los rechazos de 0 y 91, una morosidad ya generada no cambia, y la clienta y `anon` no la
  llaman).
- App (pieza 18): `domain/grace-days.ts` (el rango 1 a 90 y su guarda), `domain/errors.ts` (`InvalidGraceDays`),
  `application/grace-days.ts` sobre el puerto `SettingsRepository` y `db/settings-repository.ts`, que lee la fila única, llama a la
  función de la base y traduce `22023` a «gracia inválida». Un valor fuera de rango no llega a la base: se rechaza antes (la base lo
  vuelve a exigir). Pruebas: `application/__tests__/grace-days.test.ts` y `db/__tests__/settings-repository.test.ts`.
- Pantalla (pieza 19): una sección «Periodo de gracia» al final de `/admin/morosidades`, con la explicación de que rige solo para las
  detecciones nuevas y un campo numérico de 1 a 90 con su botón «Guardar» (`ui/review/components/GraceDaysForm.tsx`). La acción
  `setGraceDaysAction` exige sesión de administradora, valida con Zod (entero de 1 a 90), llama al caso de uso y refresca la pantalla;
  un fallo de la base se dice sin mostrar su texto interno. `review-service` lee la gracia junto con la vista y, si no se pudo leer,
  la pantalla sigue y esa sección dice que no está disponible, sin un formulario con un valor inventado. Pruebas:
  `ui/review/__tests__/review-actions.test.ts` y `review-view.test.tsx`.
- Pieza 17: la base de datos. Pieza 18: dominio, aplicación y repositorio. Pieza 19: la acción y el formulario en la pantalla.

### Correcciones de la revisión (piezas 21 a 24)

La revisión de la pila encontró cuatro cosas medias, ninguna bloqueante. Se corrigen en piezas nuevas sobre la pila, sin reescribir las ya publicadas.

- Pieza 21 (#789): el cursor del listado de activas. `delinquency_list_active` paginaba solo por `since` (`since < p_after`), que se salta a todas las clientas que empatan con la última de la página, y las morosidades de una misma corrida de detección comparten la marca de tiempo. La migración `20261108000007_delinquency_list_active_cursor.sql` cambia la firma a `(p_limit, p_after_since, p_after_client_id)` y pagina por el par `(since, client_id)`, como `payments_unpaid_charges`. Prueba: pgTAP `delinquency_list_active_cursor.test.sql`, con tres clientas de la misma marca paginadas de a dos.

- Pieza 22 (#790): la pantalla ya no calla lo que queda fuera. Cada lista trae hasta su tope (50 por revisar, 50 activas); `loadReview` pide una fila más y, si llega, `ReviewView` trae `moreToReview` o `moreActive` y la pantalla dice «Hay más morosidades por revisar. Se muestran las 50 más antiguas…» o «Hay más morosidades activas. Se muestran las 50 más recientes.». La lista de por revisar va de la más antigua a la más reciente con desempate por id, así que al decidir las primeras aparecen las demás. El repositorio llama a la función con la firma nueva. Pruebas: `application/__tests__/load-review.test.ts`, `db/__tests__/case-list-repository.test.ts` y `ui/review/__tests__/review-view.test.tsx`. Paginar con «ver más» queda fuera: con el cursor de la pieza 21 el contrato ya lo permite cuando haga falta.

- Pieza 23 (#791): los componentes de la pantalla pasan a una carpeta por componente, como en el resto del repo (`ui/review/components/<Nombre>/` con `.tsx`, `.styles.ts`, `.types.ts` cuando hay props e `index.ts`), sin cambiar su comportamiento. `ReviewBody` sale de `ReviewView.tsx` a su carpeta, el `Feedback` que estaba copiado en `CaseDecisionButtons` y `GraceDaysForm` pasa a un solo componente, `FeedbackMessage`, y el `review.styles.ts` único se reparte en los estilos de cada componente. `ReviewPage`, que no tiene props ni estilos, y `ReviewLoading`, que no tiene props, no llevan los archivos vacíos. Las pruebas no cambian: pasan igual por los `index.ts`.

- Pieza 24 (#792): la deuda real que solo estaba en prosa queda registrada en el front-matter (`deuda`), con su costo y su dueño: la morosidad no se cierra ni actualiza el monto al pagarse (US-MOR-03), un aviso por morosidad sin resumen por corrida, la cuenta de sistema compartida con el cron de recordatorios y el escaneo completo del ledger por página. La salida de `supabase test db` sobre la punta de la pila está en el PR de la pieza 24 y en el de cierre (90 archivos, 1210 pruebas). Piden revisión humana las migraciones 2, 3, 5 y 6 (detección, decidir, aviso y gracia), que traen las funciones `SECURITY DEFINER` que nadie más ha leído.

### Qué no hace todavía

US-MOR-01 está terminada. El cron existe pero no está programado: ninguna fila se genera sola hasta que se agregue su `schedule`. Qué cuenta como pago registrado y el registro de pagos son de US-MOR-03; mientras no exista, toda cita cerrada con cargo figura impaga. Bloquear la agenda (US-MOR-02), regularizar (US-MOR-03), el histórico (US-MOR-04) y levantar o perdonar (US-MOR-05) no están hechos.

## US-MOR-02: bloqueo de agenda por morosidad

Criterios del backlog:

1. Al intentar agendar, el sistema valida si la clienta tiene morosidad activa.
2. Si la tiene, se muestra un mensaje claro con el motivo, el monto y la opción de regularizar.
3. Una vez saldada la morosidad, la clienta recupera automáticamente la posibilidad de agendar.
4. La restricción se aplica también cuando la administradora agenda en nombre de la clienta, pero ella puede autorizar
   la excepción en el momento.
5. Todo bloqueo aplicado queda registrado, para poder revisar si el sistema está bloqueando clientas por error.

Recibe además de US-AGE-11 (ítem 11 de «Criterios trasladados») el indicador «Morosidad activa» en la agenda diaria: solo
cambia el adaptador de `DelinquentClientsPort`. Recibe de US-AGE-05 (ítem 7) la validación dentro de las funciones de reserva.

Depende de US-MOR-01, que quedó `terminada` en su rama pero todavía no está mergeada a `main` (INT-007): este trabajo se
adelanta apilado sobre esa rama, sin publicarse, y se rebasa sobre `us/US-MOR-01` si esa historia cambia en la revisión. Nada de
esto se publica antes de que US-MOR-01 esté mergeada a `main`.

Reglas: SEC-001 y SEC-002 (el bloqueo vive en la base, con RLS y su test de aislamiento), DOM-011 (el registro del bloqueo en
la misma transacción), DOM-012 (solo `active` bloquea; consecuencias automáticas aprobadas por el PO), ARCH-003/005 (otras
features piden por funciones del contrato), INT-003 (contrato primero), INT-008 (una migración por pieza, hacia adelante).

### Decisiones de diseño

- **El bloqueo es de la base de datos.** La clienta llama a las funciones de reserva directo por PostgREST; un chequeo solo en
  TypeScript se saltaría. `scheduling_book_appointment` y `scheduling_book_package_appointment` rechazan la reserva de una
  clienta bloqueada. `scheduling` no lee tablas de `delinquency` (ARCH-005): le pregunta por una función del contrato.
- **Un bloqueo se registra sin lanzar excepción.** Una excepción revierte la transacción y se llevaría el registro (como ya
  resolvió `scheduling_alerts` con el solape). La función de reserva devuelve un resultado «bloqueada» con el motivo y el
  monto, y deja el evento en la misma transacción (DOM-011).
- **Solo `active` bloquea** (garantía 3 del contrato). `pending_review` y `dismissed` no tienen ninguna consecuencia.
- **Recuperar el acceso es derivado, no una acción.** La clienta está bloqueada mientras tenga una morosidad `active` cuya
  cita todavía tenga saldo pendiente en el ledger, calculado en el momento. Cuando US-MOR-03 registre el pago, el saldo de la
  cita baja a cero y el acceso vuelve solo, sin tocar ninguna tabla de morosidad. Levantar o perdonar a mano es de US-MOR-05.
- **La administradora agenda en nombre de la clienta con la misma regla** y puede autorizar la excepción en ese momento: la
  autorización es un parámetro explícito de la llamada, solo admin la puede usar, exige confirmación explícita y un motivo
  obligatorio, y deja su propio evento de bitácora con quién la autorizó, la clienta y la cita. La clienta no puede
  autorizarse a sí misma ni ve esa autorización.
- **No se asume una sola persona donde no haga falta.** El bloqueo es por clienta, no por persona ni por recurso. La
  excepción registra el id de quien la autorizó, no «la» administradora. Así, cuando el estudio tenga más de una persona
  atendiendo (ver «Fuera de alcance»), este bloqueo no cambia.

### Decisiones del PO (DOM-012, Kenny, 2026-11-08)

Comunicadas por Jose Lorenzo; el registro está en `docs/process/DEPENDENCIES.md`.

- **«Saldada»:** la clienta recupera el acceso cuando el saldo de la cita que originó la morosidad llega a cero en el ledger,
  sin acción manual. Levantar o perdonar a mano es de US-MOR-05.
- **Solo bloquea una morosidad confirmada** (`active`), no una por revisar ni una descartada.
- **«Opción de regularizar» (criterio 2):** el mensaje dice que se comunique con el estudio; se cambia cuando exista US-MOR-03.
- **Texto a la clienta:** «No pudimos agendar tu cita porque tienes un saldo pendiente de ₡{monto} de tu cita del {fecha}.
  Comunícate con el estudio para regularizarlo y poder agendar de nuevo.» (Kenny lo escribió en minúsculas al mensajear; se
  usa con mayúscula inicial de oración, sin cambiar las palabras.)
- **Excepción de la administradora:** cuando agenda por una clienta morosa hay confirmación explícita y un motivo obligatorio,
  con un mínimo de caracteres. Queda en la bitácora con su nombre, la clienta y la cita. La clienta no lo ve. Kenny no fijó el
  mínimo: **pendiente** fijar el número al construir la pieza 5 (propongo 10) y confirmarlo con él.

### Diseño de la reserva bloqueada (pieza 2)

- **Cómo se dice «bloqueada» sin perder el registro.** Una excepción revertiría la transacción y se llevaría el evento. Las funciones de reserva ya devuelven una fila con `id` nulo cuando rechazan por solape y lo registran en `scheduling_alerts` en la misma transacción; el bloqueo usa el mismo camino: devuelve la fila con `id` nulo y deja el evento `scheduling.booking.blocked` en la bitácora. La aplicación distingue el bloqueo del solape preguntando a `delinquency_booking_block` (de solo lectura) y arma el mensaje con su monto y la fecha de la cita. El bloqueo se revisa **antes** del solape, así que si ambos ocurren gana el bloqueo; y si el bloqueo se levantó entre las dos llamadas la clienta ve «el espacio no está disponible» y puede reintentar.
- **La excepción de la administradora** es `scheduling_admin_book_appointment`, una función nueva con los mismos parámetros que la de la clienta más `p_client_id`, `p_authorize_exception` y `p_exception_reason`. Solo staff la puede ejecutar. Con una clienta bloqueada y sin autorización devuelve la fila con `id` nulo y registra el bloqueo igual que la de la clienta; con `p_authorize_exception = true` exige un motivo de al menos el mínimo de caracteres, agenda y deja `scheduling.booking.block_exception_authorized` con quién autorizó, la clienta, la cita y el motivo.
- **Sin pantalla.** Decisión del 2026-11-11: esta historia construye la función de la administradora y no su pantalla; agendar por una clienta desde el panel queda como historia aparte. La función se prueba con pgTAP.
- **Solo técnica suelta.** La función de la administradora cubre la reserva de una técnica, no la de un paquete (`scheduling_book_package_appointment` solo rechaza y registra, como la de la clienta). Si la administradora necesita agendar un paquete por una clienta, se agrega con su pantalla.
- **Pendiente de confirmar con Kenny:** en qué estado queda una cita que agenda la administradora (hoy, igual que la de la clienta: `pending_approval`) y el mínimo de caracteres del motivo (propongo 10).

### Fuera de alcance

Varias personas atendiendo a la misma hora no se hace ahora: el PO decidió terminar bien la base de un estudio de una persona y
tratarlo después como historia o cambio posterior. Esta historia solo cuida no asumir una sola persona donde no haga falta (ver
«Decisiones de diseño»).

### Piezas previstas

1. Arranque en docs (esta sección).
2. Contrato: lo que `delinquency` ofrece a `scheduling` (¿está bloqueada esta clienta?, con motivo y monto) y lo que `payments`
   ofrece a `delinquency` (saldo por cita).
3. Base: la función de «bloqueada» con pgTAP.
4. Base: las dos funciones de reserva rechazan y registran el bloqueo.
5. Base: la excepción autorizada por la administradora y su evento.
6. Aplicación: el adaptador real de `DelinquencyPort` y el mensaje con motivo y monto.
7. Agenda diaria: el adaptador real de `DelinquentClientsPort`.
8. Cierre: evidencia y estado.
