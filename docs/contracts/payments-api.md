# Contrato — API pública de pagos

> **Autoridad:** qué expone la feature `payments` a las demás features y bajo qué garantías. Es un contrato **de demanda**: nace de lo que necesita `delinquency` (US-MOR-01). Se versiona aquí antes de cualquier cambio (INT-003).

## Qué es

`payments` es dueña de `payments_ledger_entries`, el ledger append-only (DOM-005). Ninguna otra feature lo consulta directamente (ARCH-005): lo que necesiten del ledger lo piden por las funciones SQL de este documento. Cambiar la tabla no rompe a nadie mientras estas firmas se mantengan.

## Funciones SQL

Las tres de lectura corren con los permisos de quien llama (`SECURITY INVOKER`): la RLS del ledger decide qué se ve, así que el contrato no agrega ningún permiso. Hoy solo staff lee el ledger; una clienta o `anon` no ven ningún asiento. Solo `authenticated` tiene `EXECUTE`.

### `public.payments_client_balance(p_client_id uuid) => bigint`

La suma de los asientos de la clienta: positivo es lo que debe, negativo es saldo a su favor. Ya existe (US-AGE-12). Una clienta sin asientos, o a la que la sesión no puede ver, devuelve 0.

Quien la necesita: `delinquency`, para el saldo que muestra el expediente (criterio 4 de US-MOR-01). El saldo nunca se guarda: siempre es esta suma (DOM-005).

### `public.payments_unpaid_charges(p_closed_before timestamptz, p_limit integer, p_after_closed_at timestamptz DEFAULT NULL, p_after_appointment_id uuid DEFAULT NULL) => TABLE (client_id uuid, appointment_id uuid, pending bigint, closed_at timestamptz)`

Las citas cerradas cuyo cobro quedó con saldo pendiente. Una cita entra si tiene un asiento `charge` creado en `p_closed_before` o antes (`closed_at` es la fecha de ese asiento, el momento del cierre) y la suma de todos los asientos de esa cita es mayor que cero (`pending`). Un asiento sin `appointment_id` no cuenta. Orden: del cierre más antiguo al más reciente, con desempate por `appointment_id`. `p_limit` acota la respuesta (PERF-002): menor que 1 se trata como 1 y mayor que 500 como 500.

Se pagina por cursor, no por posición: para pedir la página siguiente se pasan `p_after_closed_at` y `p_after_appointment_id`, el `closed_at` y la cita de la última fila recibida, y la respuesta empieza justo después. Sin cursor se empieza por el principio. Así quien recorre la lista no se queda atascado en las primeras 500 filas cuando ya tiene resueltas algunas.

La función no sabe de gracia, de morosidad ni de bloqueos: solo responde qué citas cerradas siguen sin pagarse al corte que le pasen. La gracia y lo que se hace con el resultado son de `delinquency`.

Quien la necesita: la detección de US-MOR-01 (criterios 1 y 2).

### `public.payments_appointment_balances(p_appointment_ids uuid[]) => TABLE (appointment_id uuid, pending bigint)`

El saldo actual de cada cita pedida: la suma de todos los asientos de esa cita (positivo es lo que debe, cero o negativo está saldada). Una cita sin asientos, un id que no existe o una lista vacía no devuelven fila: quien llama lo lee como «sin saldo». Se pide con los ids que haga falta de una vez (PERF-002), no una llamada por cita; más de 200 ids es un error (`payments_too_many_ids`, SQLSTATE `54000`).

A diferencia de `payments_unpaid_charges`, no mira la fecha de cierre ni la gracia: responde cuánto debe una cita **hoy**. El `pending` de una morosidad es una foto del saldo al detectarla; esta función es la que dice si esa cita sigue debiendo.

Quien la necesita: `delinquency`, para decidir si una morosidad confirmada sigue bloqueando la agenda (criterio 3 de US-MOR-02: al saldarse, la clienta recupera el acceso sola). Cuando US-MOR-03 registre pagos como asientos del ledger, el saldo de la cita baja y esta función lo refleja sin cambiar su forma.

## Registro de pago (US-MOR-03)

Un pago es un asiento nuevo del ledger, nunca un cambio a uno existente (DOM-005): `kind = 'payment'`, con monto **negativo** (baja el saldo de la cita). El sistema no mueve dinero: el asiento solo registra un pago que la administradora verificó con el comprobante.

- **Varios pagos por cita.** Los pagos parciales y pequeños están permitidos (decisión del PO, 2026-11-13), así que una cita puede tener varios asientos `payment`. El índice único `(appointment_id, kind)` se acota a `charge` y `deposit_credit`, los únicos que no se repiten: cerrar dos veces sigue sin duplicar el cargo.
- **Un pago siempre es de una cita.** A diferencia de otros asientos futuros, `payment` exige `appointment_id`.

### `public.payments_record_payment(p_client_id uuid, p_appointment_id uuid, p_amount bigint) => uuid`

Escribe el asiento `payment` por `-p_amount` y devuelve su id. `created_by` lo fija la base desde la sesión, como en todo asiento.

- `p_amount` va de 1 hasta el saldo actual de la cita (`payments_appointment_balances`): 0, negativo o nulo es `payments_payment_amount_invalid`, y más que el saldo es `payments_payment_exceeds_balance` (SQLSTATE `22023` en los dos). Una cita sin saldo no admite pagos. Así un pago nunca deja la cita con saldo a favor.
- La cita tiene que tener asientos de `p_client_id`: si no, `payments_payment_wrong_client` (`22023`).
- La función toma un lock por cita, así que dos aprobaciones simultáneas de la misma cita no pasan juntas el tope del saldo.
- **Nadie con sesión la ejecuta directo:** no tiene `EXECUTE` para `anon` ni `authenticated`. Es `SECURITY INVOKER`, como `payments_record_close_entries`: la llama solo la función de aprobación de `delinquency`, que es `SECURITY DEFINER`, exige administradora y deja la bitácora en la misma transacción (DOM-011), así que corre con los permisos de esa función. Es el mismo cierre que tiene hoy el ledger tras el hallazgo M3: nadie escribe asientos sueltos.

Quien la necesita: la aprobación de una regularización (criterio 3 de US-MOR-03).

## Garantías

1. **La forma de la fila es contrato:** un cambio de columnas o de firma se versiona aquí antes del cambio (INT-003).
2. **Las funciones de lectura no escriben:** los asientos los escriben solo `scheduling_close_appointment` al cerrar la cita (cargo y anticipo) y `payments_record_payment` al aprobar un pago, las dos sin `EXECUTE` directo para nadie con sesión.
3. **La RLS es la frontera de acceso (SEC-001):** las funciones no la saltan. Si `payments` cambia sus políticas, el contrato cambia con ellas.
4. **El saldo por cita sale del ledger, nunca de una columna** (DOM-005): `payments_appointment_balances` suma los asientos en el momento de preguntar.
5. **Sin datos de contacto ni de la cita:** salen ids, un monto y una fecha; el nombre de la clienta se pide a `clients` y la cita a `scheduling`.

## Pruebas

pgTAP `supabase/tests/database/payments_record_payment.test.sql` (US-MOR-03): un pago baja el saldo de la cita, dos pagos parciales de la misma cita conviven, el tope del saldo (pagarlo exacto sí, uno más no, y una cita saldada no admite pagos), monto inválido, cita de otra clienta o sin asientos, y que ni la administradora pueda llamarla directo. `payments_ledger_payment_kind.test.sql`: el cargo y el anticipo siguen sin poder duplicarse por cita.

pgTAP `supabase/tests/database/payments_appointment_balances.test.sql` (pieza de la base de datos de US-MOR-02): una cita con cargo y anticipo menor devuelve su saldo, una saldada devuelve cero, una sin asientos no devuelve fila, el tope de ids, y que una clienta o `anon` no vean nada.

pgTAP `supabase/tests/database/payments_unpaid_charges.test.sql` (pieza de la base de datos): una cita con cargo y anticipo menor entra con su saldo, una pagada por completo no, una cerrada después del corte no, el orden, el tope, el cursor de la página siguiente, y que una clienta o `anon` no vean nada.
