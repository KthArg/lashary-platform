# Contrato — API pública de morosidad

> **Autoridad:** qué expone la feature `delinquency` a las demás features y bajo qué garantías. Es un contrato **de demanda**: nace de lo que necesita `clients` para el expediente y el listado (criterio 5 de US-MOR-01). Se versiona aquí antes de cualquier cambio (INT-003).

## Qué es

`delinquency` es dueña de las tablas de morosidad y de la configuración de la gracia. Ninguna otra feature las consulta directamente (ARCH-005): lo que necesiten lo piden por las funciones SQL de este documento.

### Estados de una morosidad

| Estado | Significado |
|---|---|
| `pending_review` | Detectada tras el periodo de gracia. La administradora recibió el aviso previo y todavía no decide: **no tiene ninguna consecuencia** sobre la clienta (DOM-012). |
| `active` | La administradora la confirmó. Es la única que cuenta como «morosidad activa». |
| `dismissed` | La administradora la descartó. No vuelve a generarse por la misma cita. |
| `lifted` | La administradora levantó el bloqueo sin registrar pago (US-MOR-05, criterio 1). El saldo original no se toca: solo deja de contar como morosidad activa. |
| `forgiven` | El saldo de la cita llegó a cero por condonación (US-MOR-05, criterio 2), sola o combinada con pagos de US-MOR-03. Terminal: no se vuelve a tocar. |
| `settled` | Saldada (US-MOR-03): la administradora aprobó una regularización y la cita quedó sin saldo. Como `dismissed`, no tiene consecuencias y ninguna función de este contrato la devuelve. |

`lifted`, `forgiven` y `settled` solo se llega a ellos desde `active` (levantar, condonar o regularizar una `pending_review` no tiene sentido: esa ya tiene su propio camino, confirmar o descartar). Ninguno borra la fila ni su `pending` original (criterio 4 de US-MOR-05): la morosidad queda visible con su estado, y si se condonó, el monto condonado.

**Condonar parcialmente no cierra el caso.** Mientras la cita siga con saldo vivo (`payments_appointment_balances`) después de condonar, la morosidad sigue `active` — puede condonarse otra vez, o saldarse con un pago de US-MOR-03 — y `exception_amount` guarda lo condonado hasta ahora (acumulado, no una foto de una sola vez). Solo pasa a `forgiven` cuando ese saldo llega a cero. Decisión de Kenny (PO), 2026-11-18.

`settled` lo pone solo la aprobación de una regularización (US-MOR-03), en la misma transacción que asienta el pago, y solo cuando la cita queda en cero; un pago parcial deja la morosidad `active`. Una `active` cuya cita se saldó por otro camino deja de bloquear igual (el bloqueo mira el saldo, US-MOR-02), aunque siga `active`. Una `active` con condonación parcial en curso (`exception_amount` no nulo) que termina de saldarse con un pago llega a `settled` conservando ese `exception_amount`/`exception_reason`, no los pierde ni pasa por `forgiven` (la pila de US-MOR-03 llegó primero a `main`; corregido en US-MOR-05 tras la auditoría del 2026-11-21).

## Funciones SQL

Corren con los permisos de quien llama (`SECURITY INVOKER`): la RLS de las tablas de morosidad decide qué se ve y hoy solo staff las lee. Las tres primeras corren así; la de bloqueo es la excepción y se explica en su sección. Solo `authenticated` tiene `EXECUTE`.

### `public.delinquency_client_states(p_client_ids uuid[]) => TABLE (client_id uuid, state text, pending bigint, since timestamptz)`

El estado de morosidad más relevante de cada clienta pedida que tenga alguna: `active` gana a `pending_review`, y `dismissed` no se devuelve. `pending` es el saldo pendiente sumado de sus citas en esa morosidad y `since` es cuándo se generó. Una clienta sin morosidad, un id que no existe o una lista vacía no devuelven fila. Se pide con los ids de la página (PERF-002), no una llamada por clienta; más de 200 ids es un error.

Quien la necesita: el listado y el expediente de `clients`, que hoy dibujan la columna de morosidad sin dato.

### `public.delinquency_all_client_states() => TABLE (client_id uuid, state text)`

El estado de morosidad de **todas** las clientas que tienen alguna no descartada, una fila por clienta y con la misma regla que `delinquency_client_states`: `active` gana a `pending_review` y `dismissed` no se devuelve. Una clienta sin morosidad no devuelve fila. No lleva saldo ni fecha, solo lo que hace falta para filtrar por estado; no recibe ids ni tiene tope porque no es para pintar una página, sino para que quien consume filtre antes de paginar (PERF-002).

Quien la necesita: `clients_list` (US-CLI-01, pieza 2/5), para el filtro de morosidad del listado de clientas: lo aplica en la base, antes de paginar. Solo la llama cuando el filtro viene; sin filtro, el listado no depende de `delinquency`.

### `public.delinquency_list_active(p_limit integer, p_after_since timestamptz, p_after_client_id uuid) => TABLE (client_id uuid, pending bigint, since timestamptz)`

Las morosidades `active`, de la más reciente a la más antigua y, a igual fecha, por clienta. Se pagina por cursor `(since, client_id)`: `p_after_since` y `p_after_client_id` son los de la última fila de la página anterior, y la siguiente empieza justo después de ella. Las morosidades de una misma corrida de detección comparten `since`, así que un cursor solo por fecha se saltaría a las que empatan. `p_after_client_id` es opcional; sin él, entran todas las que empatan con `p_after_since`. `p_limit` va de 1 a 100.

Quien la necesita: el listado de morosidades activas del panel (criterio 5). Agrega por clienta (`sum(pending)`), no por caso: para actuar sobre una morosidad puntual (US-MOR-05) hace falta el detalle por caso de la función siguiente.

### `public.delinquency_list_active_cases(p_limit integer, p_after_since timestamptz, p_after_case_id uuid) => TABLE (case_id uuid, client_id uuid, appointment_id uuid, pending bigint, exception_amount bigint, since timestamptz)`

Las morosidades `active`, una fila por caso (no agregadas por clienta), de la más reciente a la más antigua y, a igual fecha, por `case_id`. Mismo patrón de cursor que `delinquency_list_active`, por el par `(since, case_id)`. `p_limit` va de 1 a 100.

`pending` es el **saldo vivo** de la cita (`payments_appointment_balances`, ARCH-005), no la foto que guardó la detección — distinto de `delinquency_client_states`/`delinquency_list_active`, que siguen devolviendo la foto. `exception_amount` es lo condonado hasta ahora (`null` si nunca se condonó nada); juntos le bastan a la pantalla para mostrar "debe hoy" y para acotar cuánto puede condonarse.

Quien la necesita: `/admin/morosidades` (US-MOR-05), para levantar o condonar un caso puntual — `delinquency_lift_case` y `delinquency_forgive_case` actúan sobre un `case_id`, no sobre el agregado de la clienta.

### `public.delinquency_lift_case(p_case_id uuid, p_reason text) => delinquency_cases`

Levanta el bloqueo de una morosidad `active` sin tocar el ledger (criterio 1 de US-MOR-05): la deja `lifted`, con `exception_amount` en `null` aunque ya se hubiera condonado parte antes (el saldo restante simplemente se deja de perseguir, sin registrarlo como condonado). Exige `p_reason` no vacío (no solo espacios o salto de línea). Una morosidad que no está `active` es un error (`delinquency_case_not_active`); una inexistente, `delinquency_case_not_found`. Deja el evento `delinquency.case.lifted` en `audit_events` en la misma transacción, con fecha, el saldo que tenía al momento y el motivo (DOM-011).

Quien la necesita: la pantalla de morosidades activas.

### `public.delinquency_forgive_case(p_case_id uuid, p_amount bigint, p_reason text) => delinquency_cases`

Condona parte o todo el **saldo vivo** de una morosidad `active` (criterio 2 de US-MOR-05). `p_amount` debe ser mayor que cero y no mayor que `payments_appointment_balances` de la cita en ese momento (no el `pending` guardado); fuera de ese rango es `delinquency_invalid_forgive_amount`. Exige `p_reason` no vacío. Escribe el asiento llamando a `payments_record_forgiveness_entry` (`payments-api.md`, ARCH-005) y, en la misma transacción, actualiza `exception_amount` (acumulado) y deja el evento `delinquency.case.forgiven` en `audit_events` con fecha, el monto de esta condonación, el acumulado y el motivo (DOM-011). Si el saldo vivo llega a cero tras el asiento, el caso pasa a `forgiven` (terminal); si queda saldo, sigue `active` y puede condonarse de nuevo o saldarse con un pago de US-MOR-03. Puede llamarse más de una vez sobre el mismo caso mientras siga `active`.

Quien la necesita: la pantalla de morosidades activas.

## Bloqueo de la agenda (US-MOR-02)

`scheduling` le pregunta a `delinquency` si una clienta puede agendar. Es la única función de este contrato que corre con permisos de la base (`SECURITY DEFINER`), porque la clienta llama a las funciones de reserva directo por PostgREST y no puede leer las tablas de morosidad ni el ledger (RLS, SEC-001).

### `public.delinquency_booking_block(p_client_id uuid) => TABLE (appointment_id uuid, pending bigint, since timestamptz)`

Las morosidades que bloquean a la clienta, la más antigua primero (`since`, con desempate por `appointment_id`). Una fila bloquea si cumple **las dos** condiciones:

1. su estado es `active` (solo una morosidad confirmada bloquea: `pending_review` y `dismissed` no tienen ninguna consecuencia, DOM-012), y
2. su cita **todavía** tiene saldo pendiente en el ledger. El saldo se lee en el momento por `payments_appointment_balances` ([payments-api.md](payments-api.md)); `pending` de la fila es ese saldo de hoy, **no** la foto que guardó la detección.

Sin filas, la clienta puede agendar. Quien necesita el motivo y el monto toma la primera fila: `pending` es lo que debe esa cita y `appointment_id` es la cita, de la que `scheduling` lee su fecha (la cita es de `scheduling`, no se pide aquí). Pagar una cita saca solo esa fila; si queda otra, el bloqueo sigue con la siguiente.

Quién puede preguntar: la propia clienta (el `p_client_id` es el de su perfil) y el personal. Para cualquier otra sesión devuelve vacío, sin error y sin indicar si la clienta existe: así preguntar por otra persona no revela su morosidad. `anon` no tiene `EXECUTE`.

Recuperar el acceso es derivado, no una acción: cuando el saldo de la cita llega a cero la fila deja de salir, sin tocar ninguna tabla de morosidad. Levantar o perdonar a mano es de US-MOR-05.

Quien la necesita: las funciones de reserva de `scheduling` (criterios 1 y 3 de US-MOR-02), la excepción de la administradora (criterio 4). La agenda diaria (ítem 11 de «Criterios trasladados») no usa esta función: pide a muchas clientas a la vez por `delinquency_client_states`, que ya existe.

## Regularización (US-MOR-03)

La clienta regulariza una morosidad `active` enviando un comprobante; la administradora lo revisa y aprueba o rechaza. La solicitud es de `delinquency` (cuelga de una morosidad) y vive en sus tablas, que nadie más consulta (ARCH-005).

### Estados de una solicitud

| Estado | Significado |
|---|---|
| `pending_approval` | La clienta la envió y espera la revisión. Hay como mucho una por morosidad. |
| `approved` | La administradora la aprobó: se asentó el pago por el monto aprobado. |
| `rejected` | La administradora la rechazó con un motivo obligatorio, de 10 a 500 caracteres sin contar los espacios de los extremos (decisión de la clienta del 2026-11-18). La clienta puede enviar otra. |
| `replaced` | La clienta envió un comprobante nuevo mientras esta estaba pendiente: la nueva la sustituye. Se conserva para el historial. |

`replaced` es la lectura provisional de «la clienta puede reemplazar el comprobante» (Kenny, 2026-11-13), pendiente de que él la confirme. Si dice que solo se reenvía después de un rechazo, el estado desaparece y reenviar con una pendiente pasa a ser un error.

### Lo que usa la vista de estado de cuenta (`account`)

```sql
public.delinquency_my_account() => TABLE (
  case_id           uuid,
  case_state        text,         -- active o settled
  appointment_id    uuid,
  pending           bigint,       -- lo que debe esa cita hoy (payments_appointment_balances)
  since             timestamptz,  -- cuándo se detectó la morosidad
  request_id        uuid,         -- la solicitud más reciente de esa morosidad, o NULL
  request_state     text,         -- su estado, o NULL si nunca envió una
  declared_amount   bigint,       -- lo que la clienta dijo haber pagado en esa solicitud
  approved_amount   bigint,       -- lo que aprobó la administradora (solo si approved)
  rejection_reason  text,         -- solo si rejected
  reviewed_at       timestamptz
)
```

Las morosidades de la clienta de la sesión, la más antigua primero, cada una con el saldo de hoy y su solicitud más reciente (una `replaced` nunca cuenta como la más reciente): las `active` cuya cita todavía debe y las `settled` de los últimos 30 días, para que la clienta vea que su regularización se aprobó y la deuda quedó saldada. Una `active` cuya cita ya no debe nada no sale. Responde solo por la sesión (sin parámetro de clienta): una clienta no puede preguntar por otra, y una sesión que no es clienta recibe vacío. Es `SECURITY DEFINER` porque la clienta no lee las tablas de morosidad ni el ledger, como `delinquency_booking_block`. `anon` no tiene `EXECUTE`. El total que la vista muestre es la suma de `pending`: lo que debe en morosidades confirmadas. No es el saldo completo del ledger, que incluye citas recién cerradas todavía dentro de la gracia.

Quien la necesita: la pantalla de estado de cuenta de la clienta (`/portal/cuenta`, feature `account`, criterios 1 y 4). Enviar la solicitud es `delinquency_submit_regularization`, propia de `delinquency` y no de este contrato, que exige una morosidad `active` propia, lo declarado entre 1 y el saldo de hoy, y el comprobante ya subido en la carpeta de la clienta y sin usar. Enviar con el comprobante no es una función de este contrato: `account` usa la acción que exporta `delinquency` por su `index.ts` (ARCH-003), que valida el archivo por su contenido en el servidor (DOM-008) antes de llamar a la base.

### El comprobante

- Vive en un bucket privado de Supabase Storage de `delinquency` (`delinquency-receipts`), en la carpeta de la clienta (`<client_id>/<solicitud>.<ext>`). Nunca tiene URL pública: la clienta dueña y el personal lo ven por URL firmada de vida corta.
- Imagen (JPEG, PNG o WebP) o PDF, con tope de 1 MB: lo decidió la clienta (dueña del estudio) el 2026-11-18, porque un comprobante de SINPE o del banco no pasa de 1 MB (antes era 4 MB; migración `20261117100000_delinquency_receipts_1mb.sql`). El tipo se decide por los primeros bytes del archivo en el servidor, no por la extensión ni por lo que declara el navegador (DOM-008). El bucket repite el tope y la lista de tipos como segunda barrera.
- La clienta solo puede escribir en su propia carpeta, y la función que registra la solicitud comprueba que el comprobante esté ahí. No hay UPDATE ni DELETE: reemplazar es subir uno nuevo con una solicitud nueva.

### Lo que `delinquency` pide a `payments`

Aprobar llama a `payments_record_payment` ([payments-api.md](payments-api.md)) con el monto que aprobó la administradora, que puede ser distinto del declarado. Pago y estado de la solicitud van en la misma transacción, con el evento en la bitácora (DOM-011); si la cita queda en cero, la morosidad pasa a `settled`.

### Aviso a la bandeja cuando llega un comprobante

Como el aviso de morosidad por revisar, va por una función de `notifications` que llama un trigger de la tabla de solicitudes, en la misma transacción:

```sql
notifications_record_regularization_submitted(
  p_request_id      uuid,
  p_appointment_id  uuid,
  p_client_name     text,
  p_declared_amount bigint
) RETURNS void
```

- **Quién la llama:** solo el trigger, al insertarse una solicitud `pending_approval`. Es `SECURITY DEFINER` y no tiene `EXECUTE` para `anon` ni `authenticated`.
- **Un aviso por solicitud:** `p_request_id` es único; repetirlo no duplica.
- **Qué lleva:** el nombre de la clienta (de `clients_display_names`, «Clienta» si no hay), lo que declaró (columna propia, `declared_amount`) y la cita de la morosidad, que la bandeja exige y `notifications` no puede buscar sola (ARCH-005). No lleva el comprobante ni servicio u hora.
- **No bloquea:** si registrar el aviso falla, la solicitud se crea igual y el fallo queda en el log.
- La clienta no recibe aviso: ve el estado en su estado de cuenta. WhatsApp y correo quedan como deuda (Kenny, 2026-11-13).

## Aviso a la bandeja de la administradora (criterio 3 de US-MOR-01)

`delinquency` le avisa a `notifications` cuándo hay una morosidad por revisar. Va por una función SQL de `notifications` que llama un trigger de `delinquency_cases`, en la misma transacción que la detección, igual que `notifications_record_booking` de `scheduling`:

```sql
notifications_record_delinquency_review(
  p_case_id        uuid,
  p_appointment_id uuid,
  p_client_name    text,
  p_pending        bigint
) RETURNS void
```

- **Quién la llama:** solo el trigger `delinquency_cases_notify_detected`, al insertarse una morosidad en `pending_review`. Es `SECURITY DEFINER` y no tiene `EXECUTE` para `anon` ni `authenticated`.
- **Un aviso por morosidad:** `p_case_id` es único; repetirlo no duplica. Una morosidad que nace activa o descartada no avisa.
- **Qué lleva el aviso:** el nombre de la clienta (se pide a `clients_display_names`, ARCH-005; «Clienta» si no hay), lo que debe y la cita de origen. No lleva servicio ni hora de cita.
- **No bloquea:** si registrar el aviso falla, la morosidad se crea igual y el fallo queda en el log.
- **`pending_review` sigue sin consecuencias:** el aviso solo informa; la administradora decide en `/admin/morosidades` (DOM-012).

## Garantías

1. **La forma de la fila es contrato:** un cambio de columnas, de firma o de estados se versiona aquí antes del cambio (INT-003).
2. **Las funciones de este contrato no cambian una morosidad ni escriben en otra feature.** Confirmar, descartar, levantar, condonar, regularizar, aprobar y rechazar son acciones propias de `delinquency`, todas `SECURITY DEFINER` y solo para admin (o para la clienta de la sesión, en regularizar); la única escritura en otra feature es el asiento de pago o de condonación, por las funciones de `payments`.
3. **`pending_review` no bloquea:** quien consuma el contrato para decidir algo (US-MOR-02) solo puede tratar `active` como morosidad (DOM-012). `lifted`, `forgiven` y `settled` tampoco bloquean: una vez ahí, `delinquency_booking_block` ya no las cuenta (su `WHERE` filtra por `state = 'active'`).
4. **El bloqueo es de la base, no de la pantalla:** `delinquency_booking_block` lo consultan las funciones de reserva dentro de la misma transacción, así que una llamada directa a PostgREST no se lo salta (SEC-001).
5. **Sin datos de contacto:** salen ids, un monto y una fecha; el nombre se pide a `clients`.
6. **Ninguna excepción borra historial:** `delinquency_lift_case` y `delinquency_forgive_case` nunca hacen `DELETE`; la fila sigue ahí con su estado (criterio 4 de US-MOR-05).
7. **Solo se regulariza una morosidad `active`** (Kenny, 2026-11-13): una por revisar, descartada o saldada no admite solicitudes.

## Pruebas

pgTAP de la regularización (por escribir con cada función): `delinquency_my_account` responde solo por la clienta de la sesión, con el saldo de hoy y su solicitud más reciente; una solicitud solo sobre una `active` propia y con el comprobante en su carpeta; aprobar asienta el pago y salda la morosidad solo si la cita queda en cero; rechazar exige motivo; el aviso a la bandeja sale una vez por solicitud; y el bucket no deja leer ni escribir en la carpeta de otra clienta.

pgTAP `supabase/tests/database/delinquency_booking_block.test.sql` (pieza de la base de datos de US-MOR-02): una `active` con saldo bloquea con el saldo de hoy y no con la foto, una `active` ya saldada no bloquea, `pending_review` y `dismissed` no bloquean, el orden de la más antigua primero, una clienta solo pregunta por sí misma, el personal por cualquiera, y `anon` no la ejecuta.

pgTAP `supabase/tests/database/delinquency_all_client_states.test.sql` (US-CLI-01, pieza 1/5): `active` gana a `pending_review` en una sola fila por clienta, da el mismo estado por clienta que `delinquency_client_states`, `dismissed` y la clienta sin morosidad no salen, el personal ve a todas, una clienta no ve ni la suya y `anon` no la ejecuta.

pgTAP `supabase/tests/database/delinquency_contract.test.sql` (pieza de la base de datos): `active` gana a `pending_review`, `dismissed` no sale, el tope de ids, el orden y la paginación del listado, y que una clienta o `anon` no vean nada.

pgTAP `supabase/tests/database/delinquency_lift_and_forgive_case.test.sql`: levantar y condonar (total y parcial) una `active`; condonar parcial deja el caso `active` con `exception_amount` acumulado y sigue bloqueando si queda saldo; una segunda condonación sobre el mismo caso satisface el saldo y lo deja `forgiven`; levantar o condonar algo que no está `active`, un caso inexistente, un monto fuera de 1..saldo vivo o un motivo vacío/solo espacios se rechazan; la fila sigue visible después; aislamiento por rol (clienta, `anon`, staff sin admin) en ninguna de las dos funciones.

pgTAP `supabase/tests/database/delinquency_lift_unblocks_booking.test.sql`: tras `delinquency_lift_case`, `delinquency_booking_block` deja de listar esa morosidad (criterio 1 demostrado contra US-MOR-02, no solo contra el estado en la tabla).
