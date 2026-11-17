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
| `settled` | Saldada (US-MOR-03): la administradora aprobó una regularización y la cita quedó sin saldo. Como `dismissed`, no tiene consecuencias y ninguna función de este contrato la devuelve. |

`settled` lo pone solo la aprobación de una regularización, en la misma transacción que asienta el pago, y solo cuando la cita queda en cero; un pago parcial deja la morosidad `active`. Una `active` cuya cita se saldó por otro camino deja de bloquear igual (el bloqueo mira el saldo, US-MOR-02), aunque siga `active`. Levantar o perdonar (US-MOR-05) agrega su estado cuando se construya.

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

Quien la necesita: el listado de morosidades activas del panel (criterio 5).

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
| `rejected` | La administradora la rechazó con un motivo obligatorio. La clienta puede enviar otra. |
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
- Imagen (JPEG, PNG o WebP) o PDF, con tope de 4 MB: dentro del rango de 3 a 5 MB que dio Kenny (2026-11-13), porque el archivo pasa por el servidor y Vercel acepta como mucho 4,5 MB por petición. Se revisa al conocer el peso promedio. El tipo se decide por los primeros bytes del archivo en el servidor, no por la extensión ni por lo que declara el navegador (DOM-008). El bucket repite el tope y la lista de tipos como segunda barrera.
- La clienta solo puede escribir en su propia carpeta, y la función que registra la solicitud comprueba que el comprobante esté ahí. No hay UPDATE ni DELETE: reemplazar es subir uno nuevo con una solicitud nueva.

### Lo que `delinquency` pide a `payments`

Aprobar llama a `payments_record_payment` ([payments-api.md](payments-api.md)) con el monto que aprobó la administradora, que puede ser distinto del declarado. Pago y estado de la solicitud van en la misma transacción, con el evento en la bitácora (DOM-011); si la cita queda en cero, la morosidad pasa a `settled`.

### Aviso a la bandeja cuando llega un comprobante

Como el aviso de morosidad por revisar, va por una función de `notifications` que llama un trigger de la tabla de solicitudes, en la misma transacción:

```sql
notifications_record_regularization_submitted(
  p_request_id      uuid,
  p_case_id         uuid,
  p_client_name     text,
  p_declared_amount bigint
) RETURNS void
```

- **Quién la llama:** solo el trigger, al insertarse una solicitud `pending_approval`. Es `SECURITY DEFINER` y no tiene `EXECUTE` para `anon` ni `authenticated`.
- **Un aviso por solicitud:** `p_request_id` es único; repetirlo no duplica.
- **Qué lleva:** el nombre de la clienta (de `clients_display_names`, «Clienta» si no hay) y lo que declaró. No lleva el comprobante.
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
2. **Solo lectura:** ninguna función de este contrato cambia una morosidad ni escribe en otra feature. Confirmar, descartar, regularizar, aprobar y rechazar son acciones propias de `delinquency`; la única escritura en otra feature es el asiento de pago, por la función de `payments`.
3. **`pending_review` no bloquea:** quien consuma el contrato para decidir algo (US-MOR-02) solo puede tratar `active` como morosidad (DOM-012).
4. **El bloqueo es de la base, no de la pantalla:** `delinquency_booking_block` lo consultan las funciones de reserva dentro de la misma transacción, así que una llamada directa a PostgREST no se lo salta (SEC-001).
5. **Sin datos de contacto:** salen ids, un monto y una fecha; el nombre se pide a `clients`.
6. **Solo se regulariza una morosidad `active`** (Kenny, 2026-11-13): una por revisar, descartada o saldada no admite solicitudes.

## Pruebas

pgTAP de la regularización (por escribir con cada función): `delinquency_my_account` responde solo por la clienta de la sesión, con el saldo de hoy y su solicitud más reciente; una solicitud solo sobre una `active` propia y con el comprobante en su carpeta; aprobar asienta el pago y salda la morosidad solo si la cita queda en cero; rechazar exige motivo; el aviso a la bandeja sale una vez por solicitud; y el bucket no deja leer ni escribir en la carpeta de otra clienta.

pgTAP `supabase/tests/database/delinquency_booking_block.test.sql` (pieza de la base de datos de US-MOR-02): una `active` con saldo bloquea con el saldo de hoy y no con la foto, una `active` ya saldada no bloquea, `pending_review` y `dismissed` no bloquean, el orden de la más antigua primero, una clienta solo pregunta por sí misma, el personal por cualquiera, y `anon` no la ejecuta.

pgTAP `supabase/tests/database/delinquency_all_client_states.test.sql` (US-CLI-01, pieza 1/5): `active` gana a `pending_review` en una sola fila por clienta, da el mismo estado por clienta que `delinquency_client_states`, `dismissed` y la clienta sin morosidad no salen, el personal ve a todas, una clienta no ve ni la suya y `anon` no la ejecuta.

pgTAP `supabase/tests/database/delinquency_contract.test.sql` (pieza de la base de datos): `active` gana a `pending_review`, `dismissed` no sale, el tope de ids, el orden y la paginación del listado, y que una clienta o `anon` no vean nada.
