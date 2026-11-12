---
feature: delinquency
dri: pendiente
estado: en_progreso
actualizado: 2026-11-06
historias:
  - id: US-MOR-01
    estado: en_progreso
    falta: "toda la historia: se abrió el 2026-11-06 y solo existe el arranque en docs; pendientes del PO la gracia por defecto, el texto del aviso previo y qué cuenta como pago registrado mientras no exista US-MOR-03 (sección US-MOR-01, «Para aprobar por el PO»)"
  - id: US-MOR-02
    estado: no_iniciada
  - id: US-MOR-03
    estado: no_iniciada
  - id: US-MOR-04
    estado: no_iniciada
  - id: US-MOR-05
    estado: no_iniciada
flags: []
deuda: []
defectos: []
---

# delinquency

Morosidad: deteccion con gracia y aviso previo (DOM-012), bloqueo, regularizacion, override auditado.

## Qué hace hoy

Hoy: las tablas de morosidades y de configuración la función que detecta las que confirman o descartan y las del contrato (sección de US-MOR-01). La pantalla de revisión y el reflejo en `clients` existen y hay una ruta de cron para correr la detección, sin programar y cada morosidad por revisar deja un aviso en la bandeja de la administradora.

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
  `delinquency_list_active(tope, después_de)`, las dos del contrato [delinquency-api.md](../../../docs/contracts/delinquency-api.md).
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

### Qué no hace todavía

Falta el cierre de la historia. El cron existe pero no está programado: ninguna fila se genera sola.
