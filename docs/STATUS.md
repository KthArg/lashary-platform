# Estado del proyecto

> **GENERADO** por `scripts/status-gen.sh` — no editar a mano (EST-002).
> Fuente: 14 specs de feature + `docs/backlog/Product_Backlog_LASHARY_JIRA_READY.csv`. Datos al: 2026-09-10.

## Features

| Feature | DRI | Estado | terminada / en_progreso / bloqueada / en_revision / no_iniciada |
|---|---|---|---|
| account | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 0 |
| audit | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 0 |
| auth | pendiente | terminada | 2 / 0 / 0 / 0 / 0 |
| catalog | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 4 |
| clients | pendiente | en_progreso | 0 / 1 / 0 / 0 / 4 |
| content | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 3 |
| delinquency | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 5 |
| landing | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 6 |
| loyalty | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 1 |
| notifications | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 9 |
| payments | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 1 |
| platform | pendiente | terminada | 0 / 0 / 0 / 0 / 0 |
| scheduling | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 11 |
| store | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 4 |

## Detalle por feature

### account (actualizado: 2026-08-29)

### audit (actualizado: 2026-08-29)

### auth (actualizado: 2026-09-06)
- US-AUTH-01 — terminada — PR #5, tests: admin-auth.test.tsx
- US-AUTH-02 — terminada — PR #3, tests: auth-client.test.tsx, rls-isolation.test.ts

### catalog (actualizado: 2026-08-28)
- US-AGE-08 — no_iniciada
- US-PROD-01 — no_iniciada
- US-PROM-01 — no_iniciada
- US-PROM-02 — no_iniciada

### clients (actualizado: 2026-09-10)
- US-CLI-01 — no_iniciada
- US-CLI-02 — no_iniciada
- US-CLI-03 — no_iniciada
- US-CLI-04 — no_iniciada
- US-CLI-05 — en_progreso — falta: El criterio 1 existe solo como interfaz: el formulario de alta valida y reporta en consola, sin persistir. El criterio 2 funciona de punta a punta en la interfaz pero todavia sobre los datos quemados de constants/sample-clients.ts: la migracion 20260910000000 ya agrega la funcion auth_is_admin() y la politica clients_profiles_select_admin, y listClients() ya lee public.clients_profiles, pero la pantalla aun no los consume. Faltan: cablear la lista a listClients(), la unicidad de telefono, los server actions de alta y edicion, los criterios 3 y 4, el bloqueo de navegacion al salir de la pagina con el formulario abierto, y la prueba de aislamiento RLS contra Postgres (SEC-002).

### content (actualizado: 2026-08-29)
- US-BLOG-01 — no_iniciada
- US-BLOG-02 — no_iniciada
- US-BLOG-03 — no_iniciada

### delinquency (actualizado: 2026-08-28)
- US-MOR-01 — no_iniciada
- US-MOR-02 — no_iniciada
- US-MOR-03 — no_iniciada
- US-MOR-04 — no_iniciada
- US-MOR-05 — no_iniciada

### landing (actualizado: 2026-08-28)
- US-LAND-01 — no_iniciada
- US-LAND-02 — no_iniciada
- US-LAND-03 — no_iniciada
- US-LAND-04 — no_iniciada
- US-LAND-05 — no_iniciada
- US-LAND-07 — no_iniciada

### loyalty (actualizado: 2026-08-28)
- US-LAND-06 — no_iniciada

### notifications (actualizado: 2026-08-29)
- US-NOT-01 — no_iniciada
- US-NOT-02 — no_iniciada
- US-NOT-03 — no_iniciada
- US-NOT-04 — no_iniciada
- US-NOT-05 — no_iniciada
- US-NOT-06 — no_iniciada
- US-NOT-07 — no_iniciada
- US-NOT-08 — no_iniciada
- US-CLI-06 — no_iniciada

### payments (actualizado: 2026-08-29)
- US-AGE-13 — no_iniciada

### platform (actualizado: 2026-09-01)

### scheduling (actualizado: 2026-08-29)
- US-AGE-01 — no_iniciada
- US-AGE-02 — no_iniciada
- US-AGE-03 — no_iniciada
- US-AGE-04 — no_iniciada
- US-AGE-05 — no_iniciada
- US-AGE-06 — no_iniciada
- US-AGE-07 — no_iniciada
- US-AGE-09 — no_iniciada
- US-AGE-10 — no_iniciada
- US-AGE-11 — no_iniciada
- US-AGE-12 — no_iniciada

### store (actualizado: 2026-08-29)
- US-PROD-02 — no_iniciada
- US-PROD-03 — no_iniciada
- US-SHOP-01 — no_iniciada
- US-SHOP-02 — no_iniciada

## Bloqueos

Ninguno.

## Defectos conocidos

Ninguno registrado.

## Deuda aceptada
- auth: Test de aislamiento RLS contra instancia local de Supabase en CI — aceptada en PR #3 — costo: 2h
- clients: Cuatro clientas quemadas en src/features/clients/constants/sample-clients.ts para poder ejercitar la edicion sin base de datos; la pantalla no prueba lectura real — aceptada en PR pendiente — rama feat/US-CLI-05-edit-client — costo: 1h: borrar el archivo y sustituirlo por el server action cuando exista la migracion
- clients: ClientsList no tiene estados de carga ni de error (UI-003) porque su fuente es un arreglo en memoria — aceptada en PR pendiente — rama feat/US-CLI-05-edit-client — costo: 1h al conectar la lectura real
- clients: La prueba de la politica clients_profiles_select_admin modela la politica en TypeScript (src/features/clients/__tests__/rls-admin-read.test.ts); no ejecuta Postgres, asi que no demuestra la politica real (SEC-002) — aceptada en PR pendiente — rama feat/US-CLI-05-connect-db — costo: 3h: levantar supabase local en CI y correr la prueba con dos tokens reales

## Flags vivos

Ninguno.

## Historias del backlog sin feature que las reclame

Ninguna: toda historia del backlog tiene feature.
