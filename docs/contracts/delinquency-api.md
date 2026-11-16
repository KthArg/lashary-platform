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
| `forgiven` | La administradora condonó el saldo, total o parcialmente (US-MOR-05, criterio 2). Lleva un asiento `forgiveness_credit` en el ledger de `payments` por lo condonado. |

`lifted` y `forgiven` son terminales: solo se llega a ellos desde `active` (el bloqueo real es de US-MOR-02, pero el contrato ya solo cuenta `active` como morosidad; levantar o condonar una `pending_review` no tiene sentido — esa ya tiene su propio camino, confirmar o descartar). Ninguno de los dos borra la fila ni su `pending` original (criterio 4): la morosidad queda visible con su estado y, si se condonó, el monto condonado.

Regularizar (US-MOR-03) agrega sus propios estados y se versiona aquí cuando esa historia los necesite.

## Funciones SQL

Corren con los permisos de quien llama (`SECURITY INVOKER`): la RLS de las tablas de morosidad decide qué se ve y hoy solo staff las lee. Solo `authenticated` tiene `EXECUTE`.

### `public.delinquency_client_states(p_client_ids uuid[]) => TABLE (client_id uuid, state text, pending bigint, since timestamptz)`

El estado de morosidad más relevante de cada clienta pedida que tenga alguna: `active` gana a `pending_review`, y `dismissed` no se devuelve. `pending` es el saldo pendiente sumado de sus citas en esa morosidad y `since` es cuándo se generó. Una clienta sin morosidad, un id que no existe o una lista vacía no devuelven fila. Se pide con los ids de la página (PERF-002), no una llamada por clienta; más de 200 ids es un error.

Quien la necesita: el listado y el expediente de `clients`, que hoy dibujan la columna de morosidad sin dato.

### `public.delinquency_list_active(p_limit integer, p_after_since timestamptz, p_after_client_id uuid) => TABLE (client_id uuid, pending bigint, since timestamptz)`

Las morosidades `active`, de la más reciente a la más antigua y, a igual fecha, por clienta. Se pagina por cursor `(since, client_id)`: `p_after_since` y `p_after_client_id` son los de la última fila de la página anterior, y la siguiente empieza justo después de ella. Las morosidades de una misma corrida de detección comparten `since`, así que un cursor solo por fecha se saltaría a las que empatan. `p_after_client_id` es opcional; sin él, entran todas las que empatan con `p_after_since`. `p_limit` va de 1 a 100.

Quien la necesita: el listado de morosidades activas del panel (criterio 5). Agrega por clienta (`sum(pending)`), no por caso: para actuar sobre una morosidad puntual (US-MOR-05) hace falta el detalle por caso de la función siguiente.

### `public.delinquency_list_active_cases(p_limit integer, p_after_since timestamptz, p_after_case_id uuid) => TABLE (case_id uuid, client_id uuid, appointment_id uuid, pending bigint, since timestamptz)`

Las morosidades `active`, una fila por caso (no agregadas por clienta), de la más reciente a la más antigua y, a igual fecha, por `case_id`. Mismo patrón de cursor que `delinquency_list_active`, por el par `(since, case_id)`. `p_limit` va de 1 a 100.

Quien la necesita: `/admin/morosidades` (US-MOR-05), para levantar o condonar un caso puntual — `delinquency_lift_case` y `delinquency_forgive_case` actúan sobre un `case_id`, no sobre el agregado de la clienta.

### `public.delinquency_lift_case(p_case_id uuid, p_reason text) => delinquency_cases`

Levanta el bloqueo de una morosidad `active` sin tocar el ledger (criterio 1 de US-MOR-05): la deja `lifted`. Exige `p_reason` no vacío. Una morosidad que no está `active` es un error (`delinquency_case_not_active`); una inexistente, `delinquency_case_not_found`. Deja el evento `delinquency.case.lifted` en `audit_events` en la misma transacción, con fecha, el saldo que tenía al momento (no se condona nada) y el motivo (DOM-011).

Quien la necesita: la pantalla de morosidades activas.

### `public.delinquency_forgive_case(p_case_id uuid, p_amount bigint, p_reason text) => delinquency_cases`

Condona total o parcialmente una morosidad `active` (criterio 2 de US-MOR-05): la deja `forgiven`. `p_amount` debe ser mayor que cero y no mayor que el `pending` del caso; fuera de ese rango es `delinquency_invalid_forgive_amount`. Exige `p_reason` no vacío. Escribe el asiento en el ledger llamando a `payments_record_forgiveness_entry` (`payments-api.md`, ARCH-005) con el mismo `p_amount`, y dentro de la misma transacción deja el evento `delinquency.case.forgiven` en `audit_events` con fecha, el monto condonado y el motivo (DOM-011). Condonar cierra el caso aunque el monto sea parcial: el índice único del ledger (`appointment_id, kind`) solo permite un asiento `forgiveness_credit` por cita, así que no hay una segunda condonación más adelante sobre el mismo caso — si queda saldo sin condonar, se pierde como parte de esta misma decisión administrativa, registrado en la bitácora.

Quien la necesita: la pantalla de morosidades activas.

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
3. **`pending_review` no bloquea:** quien consuma el contrato para decidir algo (US-MOR-02) solo puede tratar `active` como morosidad (DOM-012). `lifted` y `forgiven` tampoco bloquean: son resoluciones.
4. **Sin datos de contacto:** salen ids, un monto y una fecha; el nombre se pide a `clients`.
5. **Ninguna excepción borra historial:** `delinquency_lift_case` y `delinquency_forgive_case` nunca hacen `DELETE`; la fila sigue ahí con su estado nuevo (criterio 4 de US-MOR-05).

## Pruebas

pgTAP `supabase/tests/database/delinquency_contract.test.sql` (pieza de la base de datos): `active` gana a `pending_review`, `dismissed` no sale, el tope de ids, el orden y la paginación del listado, y que una clienta o `anon` no vean nada.

pgTAP `supabase/tests/database/delinquency_lift_and_forgive_case.test.sql`: levantar y condonar una `active` dejan `lifted`/`forgiven` con su evento en la bitácora; levantar o condonar algo que no está `active`, un caso inexistente, un monto de condonación fuera de 1..pending o un motivo vacío se rechazan; la fila sigue visible después; una clienta o `anon` no ejecutan ninguna de las dos.
