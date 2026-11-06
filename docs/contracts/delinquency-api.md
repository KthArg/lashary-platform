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

Corren con los permisos de quien llama (`SECURITY INVOKER`): la RLS de las tablas de morosidad decide qué se ve y hoy solo staff las lee. Solo `authenticated` tiene `EXECUTE`.

### `public.delinquency_client_states(p_client_ids uuid[]) => TABLE (client_id uuid, state text, pending bigint, since timestamptz)`

El estado de morosidad más relevante de cada clienta pedida que tenga alguna: `active` gana a `pending_review`, y `dismissed` no se devuelve. `pending` es el saldo pendiente sumado de sus citas en esa morosidad y `since` es cuándo se generó. Una clienta sin morosidad, un id que no existe o una lista vacía no devuelven fila. Se pide con los ids de la página (PERF-002), no una llamada por clienta; más de 200 ids es un error.

Quien la necesita: el listado y el expediente de `clients`, que hoy dibujan la columna de morosidad sin dato.

### `public.delinquency_list_active(p_limit integer, p_after timestamptz) => TABLE (client_id uuid, pending bigint, since timestamptz)`

Las morosidades `active`, de la más reciente a la más antigua, paginadas por `since`: `p_after` devuelve las generadas antes de esa fecha. `p_limit` va de 1 a 100.

Quien la necesita: el listado de morosidades activas del panel (criterio 5).

## Garantías

1. **La forma de la fila es contrato:** un cambio de columnas, de firma o de estados se versiona aquí antes del cambio (INT-003).
2. **Solo lectura:** ninguna función de este contrato cambia una morosidad. Confirmar y descartar son acciones propias de `delinquency`.
3. **`pending_review` no bloquea:** quien consuma el contrato para decidir algo (US-MOR-02) solo puede tratar `active` como morosidad (DOM-012).
4. **Sin datos de contacto:** salen ids, un monto y una fecha; el nombre se pide a `clients`.

## Pruebas

pgTAP `supabase/tests/database/delinquency_contract.test.sql` (pieza de la base de datos): `active` gana a `pending_review`, `dismissed` no sale, el tope de ids, el orden y la paginación del listado, y que una clienta o `anon` no vean nada.
