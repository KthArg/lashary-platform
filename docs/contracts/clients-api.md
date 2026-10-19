# Contrato — API pública de clientas

> **Autoridad:** qué expone la feature `clients` a las demás features y bajo qué garantías. Es un contrato **de demanda**: nace de lo que necesita `scheduling` (US-AGE-05). Se versiona aquí antes de cualquier cambio de forma (INT-003). **Lectores:** feature `scheduling`. **Estado:** implementado en la migración `20261019000008_clients_contract_fns.sql`. **Actualizado:** 2026-10-19.

## Qué es

`clients` es dueña de `clients_profiles` (ARCH-006). Ninguna otra feature la consulta directamente (ARCH-005): lo que necesiten de una clienta lo piden por las funciones SQL de este documento. Un cambio del modelo de perfiles (renombrar `user_id`, mover el nombre a otra tabla) se absorbe dentro de estas funciones, sin tocar a quien las llama.

La excepción es una llave foránea, no una consulta: `scheduling_appointments.client_id → clients_profiles(id)`, con `ON DELETE RESTRICT`. Está registrada en el anexo del ADR-0009 y garantiza que no queden citas huérfanas.

## Funciones SQL

Las dos corren con los permisos de quien llama (`SECURITY INVOKER`): la RLS de `clients_profiles` decide qué se ve, así que el contrato no agrega ningún permiso ni expone nada que la tabla no exponga ya. Solo `authenticated` las ejecuta; `anon` no.

### `public.clients_current_profile_id() => uuid`

El `id` del perfil de la clienta de la sesión (`auth.uid()`), o nulo si la sesión no tiene perfil de clienta. No recibe parámetros: nadie puede preguntar por el perfil de otra (SEC-005). Una administradora sin perfil propio recibe nulo, no el de otra.

Quien la necesita: la reserva, la cotización y el historial de `scheduling`, que son llamadas directo por PostgREST por la clienta.

### `public.clients_display_names(p_client_ids uuid[]) => TABLE (client_id uuid, full_name text)`

El nombre de cada perfil pedido que la sesión puede ver. Una administradora ve los de todas, incluidas las clientas sin cuenta; una clienta solo ve el suyo, porque la RLS oculta los demás. Un id que no existe, una lista vacía o un argumento nulo no devuelven filas.

Quien la necesita: la cola de aprobación de `scheduling`, para mostrar de quién es cada cita pendiente. Se pide en una sola llamada con los ids de la página, no una por cita.

## Garantías

1. **La forma de la fila es contrato:** un cambio de columnas o de firma se versiona aquí antes del cambio (INT-003).
2. **Sin datos de contacto:** el contrato solo expone `id` y nombre. Teléfono, correo y el resto del perfil no salen por aquí.
3. **La RLS es la frontera de acceso (SEC-001):** las funciones no la saltan. Si `clients` cambia sus políticas, el contrato cambia con ellas.

## Pruebas

pgTAP `supabase/tests/database/clients_contract.test.sql`: la clienta recibe su perfil y solo su nombre, una sesión sin perfil o una administradora sin perfil propio reciben nulo, la administradora ve los nombres de todas, y un anónimo no ejecuta ninguna.
