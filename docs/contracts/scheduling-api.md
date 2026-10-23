# Contrato — API pública de citas

> **Autoridad:** qué expone la feature `scheduling` a las demás features y bajo qué garantías. Es un contrato **de demanda**: nace de lo que necesita `clients` para el historial de citas de una clienta (US-CLI-02). Se versiona aquí antes de cualquier cambio de forma (INT-003). **Lectores:** feature `clients`. **Estado:** implementado en la pieza 2 de US-CLI-02 (`application/list-client-appointments.ts` y `db/client-appointments-repository.ts`). **Actualizado:** 2026-10-21.

## Qué es

`scheduling` es dueña de `scheduling_appointments` (ARCH-006). Ninguna otra feature la consulta directamente (ARCH-005): lo que necesiten de las citas lo piden por la superficie de este documento, exportada en `src/features/scheduling/index.ts` (ARCH-003).

Es un caso de uso público de TypeScript y no una función SQL: quien lo usa hoy es una página del panel que lee en el servidor con la sesión de la administradora, no una clienta que llama por PostgREST. No hace falta ninguna migración: las columnas las agregó US-AGE-05 (`20261018000002_scheduling_appointment_client_snapshot.sql`), el índice `idx_scheduling_appointments_client (client_id, starts_at)` sirve al orden y la política `scheduling_appointments_select_staff` ya deja leer al personal.

## Superficie expuesta (`src/features/scheduling/index.ts`)

### `listClientAppointments(query) => Promise<Result<ClientAppointmentsPage, StorageFailed>>`

```ts
type ListClientAppointmentsQuery = {
  clientId: string
  page?: number
  pageSize?: number
}

type ClientAppointmentStatus =
  | 'pending_approval' | 'approved' | 'confirmed'
  | 'rejected' | 'cancelled' | 'completed' | 'no_show'

type ClientAppointmentView = {
  id: string
  startsAtMs: number
  status: ClientAppointmentStatus
  techniqueName: string
  depositRequired: number
  depositRegistered: number
}

type ClientAppointmentsPage = {
  items: ClientAppointmentView[]
  total: number
  page: number
  pageSize: number
}
```

- Lee con el cliente de Supabase de servidor y la sesión de quien llama, como `listTechniques` de `catalog`: `index.ts` arma el repositorio y llama al caso de uso. Nunca usa la llave de servicio (SEC-003).
- `clientId` es el `id` de `clients_profiles`, la misma identidad que `scheduling_appointments.client_id`.
- `page` empieza en 0, como el listado de clientas. Un valor que no es entero o es negativo se lee como 0.
- `pageSize` vale 25 si no viene o no es un entero positivo, y nunca pasa de 50 (PERF-002).
- Devuelve **todas** las citas de la clienta, en los siete estados: el historial incluye las rechazadas, canceladas y ausencias.
- Ordena por `starts_at` de la más reciente a la más antigua y, si dos empiezan a la vez, por `id`, para que una página no cambie entre lecturas.
- `startsAtMs` es el instante de inicio en milisegundos UTC (DOM-003). Formatearlo en la hora del estudio es trabajo de quien muestra.
- `techniqueName`, `depositRequired` y `depositRegistered` son lo que se congeló al reservar (DOM-002), en colones enteros (DOM-001). No se vuelven a leer del catálogo.
- `total` cuenta todas las citas de la clienta, no solo las de la página.

Consumidor: **US-CLI-02**, la pestaña "Citas" de la ficha de la clienta en `/admin/clients/<id>/citas`.

## Qué no expone

- **El pago completo de la cita.** La cita solo guarda el anticipo requerido y el registrado. El cargo al cerrar la cita y su saldo los produce el libro contable de US-AGE-12; cuando exista, el estado de pago se pide por su propio contrato con el `id` de cada cita, sin cambiar la forma de este.
- **Las anotaciones.** Son de `clients` (US-CLI-03) y se guardan con el `id` de la cita.
- **Datos de la decisión y de la reserva:** `decided_by`, `decision_reason`, `resource_id`, `occupied_range`, `service_price`, `is_first_time` e `is_first_time_detected` no salen por aquí.
- **Citas sin clienta.** Las que crea el personal tienen `client_id` nulo y no pertenecen al historial de nadie.

## Garantías

1. **La forma de la fila es contrato:** un cambio de campos o de firma se versiona aquí antes del cambio (INT-003).
2. **La RLS es la frontera de acceso (SEC-001):** el caso de uso lee con la sesión de quien llama. El personal ve las citas de cualquier clienta; una clienta solo ve las suyas (`scheduling_appointments_select_own`), así que con el `id` de otra recibe una página vacía.
3. **No comprueba que la clienta exista.** Un `clientId` sin citas o inexistente devuelve `items` vacío y `total` 0. Una página más allá de la última devuelve `items` vacío con el `total` real: PostgREST responde `PGRST103` y el repositorio cuenta aparte, para que quien llama pueda volver a la primera página. Comprobar que el recurso existe es de quien llama (SEC-005); en el panel lo hace el layout de la ficha con `getClientAction`.
4. **Un fallo de la base es `StorageFailed`**, nunca una página vacía: un historial vacío por error se leería como "esta clienta nunca vino". El caso de uso no lanza.
5. **Una sola lectura por página:** una consulta con `count: 'exact'`, sin consultas por fila (PERF-005).
6. **El `id` de la cita es estable**, para que `clients` le cuelgue sus anotaciones y las pida para toda la página en una sola consulta.

## Pruebas

`src/features/scheduling/application/__tests__/list-client-appointments.test.ts` (página y tamaño saneados, el fallo de la base como `StorageFailed`) y `src/features/scheduling/db/__tests__/client-appointments-repository.test.ts` (columnas pedidas, filtro por clienta, orden, rango de la página y conteo). El aislamiento de la RLS ya lo prueban `scheduling_appointment_client_snapshot.test.sql` y `__tests__/rls-isolation.test.ts` (SEC-002).

## Eventos de dominio

Ninguno. Leer el historial no cambia ninguna cita.
