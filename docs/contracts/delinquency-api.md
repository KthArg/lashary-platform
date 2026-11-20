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
| `settled` | El saldo de la cita llegó a cero por pagos aprobados (US-MOR-03). Puede conservar `exception_amount` si antes hubo una condonación parcial. Terminal. |

`lifted` y `forgiven` solo se llega a ellos desde `active` (levantar o condonar una `pending_review` no tiene sentido: esa ya tiene su propio camino, confirmar o descartar). Ninguno de los dos borra la fila ni su `pending` original (criterio 4): la morosidad queda visible con su estado, y si se condonó, el monto condonado.

**Condonar parcialmente no cierra el caso.** Mientras la cita siga con saldo vivo (`payments_appointment_balances`) después de condonar, la morosidad sigue `active` — puede condonarse otra vez, o saldarse con un pago de US-MOR-03 — y `exception_amount` guarda lo condonado hasta ahora (acumulado, no una foto de una sola vez). Solo pasa a `forgiven` cuando ese saldo llega a cero. Decisión de Kenny (PO), 2026-11-18.

Regularizar (US-MOR-03) agrega sus propios estados y se versiona aquí cuando esa historia los necesite.

## Funciones SQL

Corren con los permisos de quien llama (`SECURITY INVOKER`): la RLS de las tablas de morosidad decide qué se ve y hoy solo staff las lee. Las dos primeras corren así; la de bloqueo es la excepción y se explica en su sección. Solo `authenticated` tiene `EXECUTE`.

### `public.delinquency_client_states(p_client_ids uuid[]) => TABLE (client_id uuid, state text, pending bigint, since timestamptz)`

El estado de morosidad más relevante de cada clienta pedida que tenga alguna: `active` gana a `pending_review`, y `dismissed` no se devuelve. `pending` es el saldo pendiente sumado de sus citas en esa morosidad y `since` es cuándo se generó. Una clienta sin morosidad, un id que no existe o una lista vacía no devuelven fila. Se pide con los ids de la página (PERF-002), no una llamada por clienta; más de 200 ids es un error.

Quien la necesita: el listado y el expediente de `clients`, que hoy dibujan la columna de morosidad sin dato.

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
2. **Las funciones de lectura no cambian una morosidad.** Confirmar, descartar, levantar y condonar son las únicas que escriben, todas de `delinquency`, todas `SECURITY DEFINER` y solo para admin.
3. **`pending_review` no bloquea:** quien consuma el contrato para decidir algo (US-MOR-02) solo puede tratar `active` como morosidad (DOM-012). `lifted` y `forgiven` tampoco bloquean: una vez ahí, `delinquency_booking_block` ya no las cuenta (su `WHERE` filtra por `state = 'active'`).
4. **El bloqueo es de la base, no de la pantalla:** `delinquency_booking_block` lo consultan las funciones de reserva dentro de la misma transacción, así que una llamada directa a PostgREST no se lo salta (SEC-001).
5. **Sin datos de contacto:** salen ids, un monto y una fecha; el nombre se pide a `clients`.
6. **Ninguna excepción borra historial:** `delinquency_lift_case` y `delinquency_forgive_case` nunca hacen `DELETE`; la fila sigue ahí con su estado (criterio 4 de US-MOR-05).

## Pruebas

pgTAP `supabase/tests/database/delinquency_booking_block.test.sql` (pieza de la base de datos de US-MOR-02): una `active` con saldo bloquea con el saldo de hoy y no con la foto, una `active` ya saldada no bloquea, `pending_review` y `dismissed` no bloquean, el orden de la más antigua primero, una clienta solo pregunta por sí misma, el personal por cualquiera, y `anon` no la ejecuta.

pgTAP `supabase/tests/database/delinquency_contract.test.sql` (pieza de la base de datos): `active` gana a `pending_review`, `dismissed` no sale, el tope de ids, el orden y la paginación del listado, y que una clienta o `anon` no vean nada.

pgTAP `supabase/tests/database/delinquency_lift_and_forgive_case.test.sql`: levantar y condonar (total y parcial) una `active`; condonar parcial deja el caso `active` con `exception_amount` acumulado y sigue bloqueando si queda saldo; una segunda condonación sobre el mismo caso satisface el saldo y lo deja `forgiven`; levantar o condonar algo que no está `active`, un caso inexistente, un monto fuera de 1..saldo vivo o un motivo vacío/solo espacios se rechazan; la fila sigue visible después; aislamiento por rol (clienta, `anon`, staff sin admin) en ninguna de las dos funciones.

pgTAP `supabase/tests/database/delinquency_lift_unblocks_booking.test.sql`: tras `delinquency_lift_case`, `delinquency_booking_block` deja de listar esa morosidad (criterio 1 demostrado contra US-MOR-02, no solo contra el estado en la tabla).
