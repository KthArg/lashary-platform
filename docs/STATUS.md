# Estado del proyecto

> **GENERADO** por `scripts/status-gen.sh` — no editar a mano (EST-002).
> Fuente: 14 specs de feature + `docs/backlog/Product_Backlog_LASHARY_JIRA_READY.csv`. Datos al: 2026-09-21.

## Features

| Feature | DRI | Estado | terminada / en_progreso / bloqueada / en_revision / no_iniciada |
|---|---|---|---|
| account | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 0 |
| audit | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 0 |
| auth | pendiente | terminada | 2 / 0 / 0 / 0 / 0 |
| catalog | pendiente | en_progreso | 1 / 0 / 0 / 0 / 3 |
| clients | pendiente | en_progreso | 1 / 1 / 0 / 0 / 3 |
| content | pendiente | en_progreso | 0 / 0 / 0 / 0 / 3 |
| delinquency | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 5 |
| landing | pendiente | en_progreso | 0 / 0 / 0 / 1 / 5 |
| loyalty | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 1 |
| notifications | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 9 |
| payments | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 1 |
| platform | pendiente | terminada | 0 / 0 / 0 / 0 / 0 |
| scheduling | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 11 |
| store | pendiente | en_progreso | 0 / 1 / 0 / 0 / 3 |

## Detalle por feature

### account (actualizado: 2026-08-29)

### audit (actualizado: 2026-08-29)

### auth (actualizado: 2026-09-12)
- US-AUTH-01 — terminada — PR #5, PR #9, PR #17, tests: admin-auth.test.tsx
- US-AUTH-02 — terminada — PR #3, PR #18, tests: auth-client.test.tsx, rls-isolation.test.ts

### catalog (actualizado: 2026-09-20)
- US-AGE-08 — terminada — PR #7, PR #50, tests: seed.integration.test.ts, technique.test.ts, queries.test.ts, commands.test.ts, actions.test.ts, schema.test.ts, technique-repository.integration.test.ts, public-api.integration.test.ts, rls-isolation.test.ts, layout.test.tsx
- US-PROD-01 — no_iniciada
- US-PROM-01 — no_iniciada
- US-PROM-02 — no_iniciada

### clients (actualizado: 2026-09-20)
- US-CLI-01 — en_progreso — falta: filtro por nombre en la pantalla y su estado de vacio por filtro; las columnas de morosidad y ultima cita existen sin dato y su filtro no existe: el dato espera a US-MOR-01 y a US-AGE-05 (criterios diferidos)
- US-CLI-02 — no_iniciada
- US-CLI-03 — no_iniciada
- US-CLI-04 — no_iniciada
- US-CLI-05 — terminada — PR #16, PR #28, PR #31, PR #32, tests: clients-actions.test.ts, save-client.test.tsx, list-clients.test.ts, clients-list.test.tsx, update-client.test.ts, edit-client.test.tsx

### content (actualizado: 2026-09-16)
- US-BLOG-01 — no_iniciada
- US-BLOG-02 — no_iniciada
- US-BLOG-03 — no_iniciada

### delinquency (actualizado: 2026-08-28)
- US-MOR-01 — no_iniciada
- US-MOR-02 — no_iniciada
- US-MOR-03 — no_iniciada
- US-MOR-04 — no_iniciada
- US-MOR-05 — no_iniciada

### landing (actualizado: 2026-09-16)
- US-LAND-01 — en_revision — falta: aprobacion visual del PO de la parte atractivo del criterio 2, con las capturas del artefacto capturas-landing de CI; el modelo de contenido hero, intro y closingCta no esta en lashary-cms
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

### platform (actualizado: 2026-09-16)

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

### store (actualizado: 2026-09-21)
- US-PROD-02 — en_progreso — falta: Panel admin para gestionar productos desde CMS.
- US-PROD-03 — no_iniciada
- US-SHOP-01 — no_iniciada
- US-SHOP-02 — no_iniciada

## Bloqueos

Ninguno.

## Defectos conocidos

Ninguno registrado.

## Deuda aceptada
- auth: Test de aislamiento RLS contra instancia local de Supabase en CI — aceptada en PR #3 — costo: 2h
- clients: Prueba de aislamiento RLS (SEC-002) de las politicas de administradora de clients_profiles (supabase/migrations/20260911000000_clients_profiles_admin_access.sql): las pruebas simulan Supabase y no demuestran que una clienta con token valido no pueda leer, crear ni editar a otras — aceptada en PR #32, etiqueta excepcion-proceso — costo: 3h: arnes de Supabase local en CI y el test con token de clienta contra SELECT, INSERT y UPDATE; 1h si ya existe el arnes de la deuda de auth (PR #3)

## Flags vivos

Ninguno.

## Historias del backlog sin feature que las reclame

Ninguna: toda historia del backlog tiene feature.
