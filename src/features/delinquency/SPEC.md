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

Hoy: las tablas de morosidades y de configuración la función que detecta y la que confirma o descarta (sección de US-MOR-01). Todavía no hay cron, pantalla ni aviso.

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

### Confirmar y descartar (pieza 6)

- Migración `20261108000003_delinquency_decide_case_fn.sql`: `delinquency_decide_case(morosidad, decisión)`
  (`SECURITY DEFINER`, solo admin; la clienta y `anon` reciben `42501`). `confirm` deja la morosidad `active` y
  `dismiss` la deja `dismissed`, con quién y cuándo decidió. Solo se decide una morosidad `pending_review`: una ya
  decidida es el error `delinquency_case_already_decided` y una inexistente `delinquency_case_not_found`. El
  evento `delinquency.case.confirmed` o `delinquency.case.dismissed` queda en `audit_events` en la misma
  transacción (DOM-011). Prueba: pgTAP `delinquency_decide_case.test.sql`.
- Dominio: `domain/delinquency-case.ts` (estados y decisiones) y `domain/errors.ts` (errores con guarda de tipo, DOM-006).
- Todavía nadie la llama: el caso de uso, el repositorio y la acción llegan en la pieza siguiente.

### Qué no hace todavía

No hay todavía el cron que corre la detección, la pantalla ni el aviso previo: son piezas siguientes. La detección existe en la base pero nadie la llama: ninguna fila se genera sola.
