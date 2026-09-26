# Estado del proyecto

> **GENERADO** por `scripts/status-gen.sh` — no editar a mano (EST-002).
> Fuente: 14 specs de feature + `docs/backlog/Product_Backlog_LASHARY_JIRA_READY.csv`. Datos al: 2026-09-25.

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
| landing | pendiente | en_progreso | 6 / 0 / 0 / 0 / 0 |
| loyalty | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 1 |
| notifications | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 9 |
| payments | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 1 |
| platform | pendiente | terminada | 0 / 0 / 0 / 0 / 0 |
| scheduling | pendiente | en_progreso | 0 / 1 / 0 / 0 / 10 |
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

### clients (actualizado: 2026-09-21)
- US-CLI-01 — en_progreso — falta: las columnas de morosidad y ultima cita existen sin dato y no tienen filtro: el dato espera a US-MOR-01 y el de ultima cita a US-AGE-05 (criterios diferidos)
- US-CLI-02 — no_iniciada
- US-CLI-03 — no_iniciada
- US-CLI-04 — no_iniciada
- US-CLI-05 — terminada — PR #16, PR #28, PR #31, PR #32, tests: clients-actions.test.ts, save-client.test.tsx, list-clients.test.ts, clients-list.test.tsx, update-client.test.ts, edit-client.test.tsx

### content (actualizado: 2026-09-21)
- US-BLOG-01 — no_iniciada
- US-BLOG-02 — no_iniciada
- US-BLOG-03 — no_iniciada

### delinquency (actualizado: 2026-08-28)
- US-MOR-01 — no_iniciada
- US-MOR-02 — no_iniciada
- US-MOR-03 — no_iniciada
- US-MOR-04 — no_iniciada
- US-MOR-05 — no_iniciada

### landing (actualizado: 2026-09-21)
- US-LAND-01 — terminada — PR #49 (us/US-LAND-01 a main); piezas PRs #35 a #45; PR #58 corrige la clave closing-cta del CMS; aprobacion visual del PO el 2026-09-16 sobre las capturas del artefacto capturas-landing; el modelo hero, intro y closing-cta esta en cms.config.ts de lashary-cms y las tres claves responden 200. Pruebas: landing-hero.test.tsx, landing-home.test.tsx, site-header.test.tsx, opening-frame.test.ts, cms-reader.test.ts, landing-source.test.ts, webhook.test.ts, get-landing-content.test.ts; e2e home-hero.spec.ts, home-responsive.spec.ts, home-screenshots.spec.ts
- US-LAND-02 — terminada — PR #63 (us/US-LAND-02 a main). Las fotos salen del CMS por la coleccion tecnicas, contrato v1.1 de docs/contracts/cms-api.md, cuya otra mitad es el PR #6 de lashary-cms (decision del PO el 2026-09-16: las imagenes van en el CMS). Criterios 1 a 5 demostrados en ui/__tests__/landing-techniques.test.tsx; el gateway, en content/application/__tests__/get-technique-media.test.ts, cms/__tests__/cms-reader.test.ts y cms/__tests__/webhook.test.ts. Verificado ademas contra el CMS local: fila publicada desde el panel, foto y ejemplo servidos por /api/content/tecnicas y renderizados en la landing tras el aviso firmado que invalida content:tecnicas
- US-LAND-03 — terminada — PRs #74 (contrato v1.2, coleccion galeria), #75 (lectura en content), #76 (cuadricula y filtro) y #77 (galeria ampliada y montaje), apilados hacia us/US-LAND-03; la otra mitad del contrato esta en el main de lashary-cms (3506d01). Criterios 1 y 3 en ui/__tests__/landing-gallery.test.tsx; 2 en content/cms/__tests__/gallery-source.test.ts y webhook.test.ts; 4 en content/application/__tests__/get-gallery.test.ts. Verificado ademas con un CMS simulado en next dev: 6 pares de 7 (el septimo sin consentimiento no aparece), sin scroll horizontal en 320, 375, 768, 1280, 1920 y 667x375, y la galeria ampliada cabe en 667x375
- US-LAND-04 — terminada — PRs #78 (contrato v1.3), #79 (validacion en content), #80 (getStudio con cache y aviso), #81 (seccion El estudio) y #82 (Por que aca, montaje y navegacion), apilados hacia us/US-LAND-04; la otra mitad del contrato esta en el main de lashary-cms (f4a4481). Criterios 1 y 2 en ui/__tests__/landing-studio.test.tsx y content/application/__tests__/get-studio.test.ts; 3 en content/cms/__tests__/studio-source.test.ts, webhook.test.ts y cms-reader.test.ts; 4 en landing-studio.test.tsx (Navegacion). Verificado ademas con un CMS simulado en next dev: retrato, 3 credenciales y 5 razones, sin scroll horizontal en 320, 375, 768, 1280, 1920 y 667x375; con el CMS caido, El estudio cae al respaldo y la pagina se sirve
- US-LAND-05 — terminada — PRs #83 (contrato v1.4), #84 (getLoyalty) y #85 (seccion Fidelidad, montaje y navegacion), apilados hacia us/US-LAND-05; la otra mitad del contrato esta en el main de lashary-cms (8c55f64). Criterio 1 en ui/__tests__/landing-loyalty.test.tsx y content/application/__tests__/get-loyalty.test.ts; criterio 2 en content/cms/__tests__/loyalty-source.test.ts y webhook.test.ts. Verificado ademas con un CMS simulado en next dev: texto, letra chica y 3 niveles ordenados por visita, sin scroll horizontal en 320, 375, 768, 1280, 1920 y 667x375. Solo informativa: el conteo de visitas es US-LAND-06
- US-LAND-07 — terminada — PRs #86 (contrato v1.5), #87 (validacion en content), #88 (getContact con cache y aviso), #89 (Ubicacion), #90 (Preguntas) y #91 (pie de pagina, montaje y navegacion), apilados hacia us/US-LAND-07; la otra mitad del contrato esta en el main de lashary-cms (6e43e3f). Criterios 1 a 3 en ui/__tests__/landing-location.test.tsx y content/application/__tests__/get-contact.test.ts; 4 en content/cms/__tests__/contact-source.test.ts y webhook.test.ts; 5 en ui/__tests__/site-footer.test.tsx. Verificado ademas con un CMS simulado en next dev: sin scroll horizontal en 320, 375, 768, 860, 1024, 1280, 1920 y 667x375, la navegacion de escritorio con sus 6 enlaces entra desde 860 px, y el enlace de WhatsApp lleva el mensaje codificado

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

### scheduling (actualizado: 2026-09-25)
- US-AGE-01 — en_progreso — falta: El panel administrativo (UI) con su wiring en src/app. El criterio 'reducir disponibilidad no elimina citas ya agendadas' queda diferido: depende de scheduling_appointments, que no existe hasta US-AGE-05.
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
- scheduling: Ningún bloque semanal de disponibilidad valida que no se superponga con otro del mismo día — ni en el constructor de WeeklyAvailabilityBlock, ni en defineWeeklyAvailability, ni en la migración (sin EXCLUDE). Es posible definir lunes 09:00-13:00 y lunes 12:00-18:00 a la vez. — aceptada en US-AGE-01, pieza 1/3 (disponibilidad semanal) — costo: 1h
- scheduling: ClosedDate valida el formato YYYY-MM-DD por regex, no el calendario real: acepta fechas inexistentes como 2026-02-30 o 2026-13-01. — aceptada en US-AGE-01, pieza 2/3 (días no laborables) — costo: 30m

## Flags vivos

Ninguno.

## Historias del backlog sin feature que las reclame

Ninguna: toda historia del backlog tiene feature.
