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

Regularizar y levantar o perdonar (US-MOR-03 y US-MOR-05) agregan sus propios estados y se versionan aquí cuando esas historias los necesiten.

## Funciones SQL

Corren con los permisos de quien llama (`SECURITY INVOKER`): la RLS de las tablas de morosidad decide qué se ve y hoy solo staff las lee. Las dos primeras corren así; la de bloqueo es la excepción y se explica en su sección. Solo `authenticated` tiene `EXECUTE`.

### `public.delinquency_client_states(p_client_ids uuid[]) => TABLE (client_id uuid, state text, pending bigint, since timestamptz)`

El estado de morosidad más relevante de cada clienta pedida que tenga alguna: `active` gana a `pending_review`, y `dismissed` no se devuelve. `pending` es el saldo pendiente sumado de sus citas en esa morosidad y `since` es cuándo se generó. Una clienta sin morosidad, un id que no existe o una lista vacía no devuelven fila. Se pide con los ids de la página (PERF-002), no una llamada por clienta; más de 200 ids es un error.

Quien la necesita: el listado y el expediente de `clients`, que hoy dibujan la columna de morosidad sin dato.

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
2. **Solo lectura:** ninguna función de este contrato cambia una morosidad ni escribe en otra feature. Confirmar y descartar son acciones propias de `delinquency`.
3. **`pending_review` no bloquea:** quien consuma el contrato para decidir algo (US-MOR-02) solo puede tratar `active` como morosidad (DOM-012).
4. **El bloqueo es de la base, no de la pantalla:** `delinquency_booking_block` lo consultan las funciones de reserva dentro de la misma transacción, así que una llamada directa a PostgREST no se lo salta (SEC-001).
5. **Sin datos de contacto:** salen ids, un monto y una fecha; el nombre se pide a `clients`.

## Pruebas

pgTAP `supabase/tests/database/delinquency_booking_block.test.sql` (pieza de la base de datos de US-MOR-02): una `active` con saldo bloquea con el saldo de hoy y no con la foto, una `active` ya saldada no bloquea, `pending_review` y `dismissed` no bloquean, el orden de la más antigua primero, una clienta solo pregunta por sí misma, el personal por cualquiera, y `anon` no la ejecuta.

pgTAP `supabase/tests/database/delinquency_contract.test.sql` (pieza de la base de datos): `active` gana a `pending_review`, `dismissed` no sale, el tope de ids, el orden y la paginación del listado, y que una clienta o `anon` no vean nada.
