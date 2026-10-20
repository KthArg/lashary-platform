# Estado del proyecto

> **GENERADO** por `scripts/status-gen.sh` — no editar a mano (EST-002).
> Fuente: 14 specs de feature + `docs/backlog/Product_Backlog_LASHARY_JIRA_READY.csv`. Datos al: 2026-10-24.

## Features

| Feature | DRI | Estado | terminada / en_progreso / bloqueada / en_revision / no_iniciada |
|---|---|---|---|
| account | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 0 |
| audit | pendiente | terminada | 0 / 0 / 0 / 0 / 0 |
| auth | pendiente | terminada | 2 / 0 / 0 / 0 / 0 |
| catalog | pendiente | en_progreso | 2 / 0 / 0 / 0 / 2 |
| clients | pendiente | en_progreso | 2 / 1 / 0 / 0 / 2 |
| content | pendiente | terminada | 3 / 0 / 0 / 0 / 0 |
| delinquency | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 5 |
| landing | pendiente | terminada | 6 / 0 / 0 / 0 / 0 |
| loyalty | pendiente | no_iniciada | 0 / 0 / 0 / 0 / 1 |
| notifications | pendiente | en_progreso | 0 / 1 / 0 / 0 / 8 |
| payments | pendiente | terminada | 1 / 0 / 0 / 0 / 0 |
| platform | pendiente | terminada | 0 / 0 / 0 / 0 / 0 |
| scheduling | pendiente | en_progreso | 5 / 0 / 0 / 0 / 6 |
| store | pendiente | en_progreso | 3 / 0 / 0 / 0 / 1 |

## Detalle por feature

### account (actualizado: 2026-08-29)

### audit (actualizado: 2026-09-30)

### auth (actualizado: 2026-10-14)
- US-AUTH-01 — terminada — PR #5, PR #9, PR #17, tests: admin-auth.test.tsx
- US-AUTH-02 — terminada — PR #3, PR #18, tests: auth-client.test.tsx, rls-isolation.test.ts

### catalog (actualizado: 2026-10-18)
- US-AGE-08 — terminada — PR #7, PR #50, tests: seed.integration.test.ts, technique.test.ts, queries.test.ts, commands.test.ts, actions.test.ts, schema.test.ts, technique-repository.integration.test.ts, public-api.integration.test.ts, rls-isolation.test.ts, layout.test.tsx
- US-PROD-01 — terminada — PRs #98 a #107, #134, #157 a #168 (pila) y el cierre us/US-PROD-01 a main; tests: package.test.ts, package-commands.test.ts, package-queries.test.ts, package-actions.test.ts, package-schema.test.ts, package-inactive-techniques.test.tsx, package-pagination.test.tsx, package-repository.integration.test.ts, package-rls-isolation.test.ts, catalog_package_staff_write.test.sql; UI probada a mano contra lashary-pruebas (2026-10-03)
- US-PROM-01 — no_iniciada
- US-PROM-02 — no_iniciada

### clients (actualizado: 2026-10-20)
- US-CLI-01 — en_progreso — falta: las columnas de morosidad y ultima cita existen sin dato y no tienen filtro: el dato espera a US-MOR-01 y el de ultima cita a US-AGE-05 (criterios diferidos)
- US-CLI-02 — no_iniciada
- US-CLI-03 — no_iniciada
- US-CLI-04 — terminada — Pila de 20 piezas: PRs #369 (1/20, esquema), #370 (2/20, bucket), #372, #374, #384, #385, #394, #395, #396, #404, #405, #406, #407, #408 (14/20, cierre funcional), #409 y #410 (mejoras visuales) y los PRs de las piezas 17/20 a 20/20 (auditoria del 2026-10-19). Criterio 1 (estudio con texto e imagenes): record-content.test.ts, record-changes.test.ts, record-commands.test.ts, study-editor.test.tsx, add-record-image.test.ts, record-image.test.ts, record-image-action.test.ts, images-editor.test.tsx. Criterio 2 (alergias, sensibilidades, condiciones): clients_record_versions.test.sql (categorias), record-content.test.ts, precautions-editor.test.tsx. Criterio 3 (solo la administradora y cada acceso en la bitacora): clients_record_versions.test.sql y clients_record_images_bucket.test.sql (aislamiento SEC-002 frente a clienta y anon), view-record.test.ts (bitacora fail-closed), record-gateways.test.ts, record-actions.test.ts, record-queries.test.ts. Criterio 4 (historial de cambios): clients_record_versions.test.sql (sin UPDATE ni DELETE, una sucesora por version), record-changes.test.ts, record-commands.test.ts (dos cambios simultaneos), record-history.test.ts, record-view.test.tsx. Criterio 5 (imagenes sin URL publica): clients_record_images_bucket.test.sql (bucket privado), record-image-storage.test.ts (URLs firmadas de 5 minutos), images-editor.test.tsx
- US-CLI-05 — terminada — PR #16, PR #28, PR #31, PR #32, tests: clients-actions.test.ts, save-client.test.tsx, list-clients.test.ts, clients-list.test.tsx, update-client.test.ts, edit-client.test.tsx

### content (actualizado: 2026-10-14)
- US-BLOG-01 — terminada — PR de cierre us/US-BLOG-01 a main (contrato v1.6 de docs/contracts/cms-api.md). La historia la cumple el CMS (ADR-0001): la coleccion posts esta declarada en el main de lashary-cms (f3f8e26) y sus tres criterios estan demostrados alli, contra ese tipo y por la ruta publica GET /api/content/posts, en tests/integration/blog-posts.test.ts. Criterio 1: crea una publicacion con titulo, cuerpo enriquecido e imagen destacada, y sin imagen destacada no se puede publicar. Criterio 2: editar una publicacion cambia lo que se ve al volver a publicarla, y eliminar una publicacion la quita de lo publico y deja las demas. Criterio 3: una publicacion en borrador no es visible publicamente, y los cambios sin publicar de una ya publicada tampoco se ven. Los seis casos caen al mutar lo que protegen. Desplegado: GET https://lashary-cms.vercel.app/api/content/posts responde 200 desde el 2026-10-13. El PR #113, que traia un contrato anterior, se cerro sin fusionar el 2026-10-13
- US-BLOG-02 — terminada — PR #294 (us/US-BLOG-02 a main); piezas PRs #295 (validacion, orden y pagina), #296 (getBlogPage con cache y aviso), #297 (BlogList) y #298 (la ruta /blog), apiladas hacia us/US-BLOG-02. Criterio 1 (fecha descendente): domain/__tests__/blog.test.ts (newestFirst), application/__tests__/get-blog-posts.test.ts y cms/__tests__/blog-source.test.ts. Criterio 2 (imagen, titulo y extracto en cada tarjeta): ui/blog/__tests__/blog-list.test.tsx y get-blog-posts.test.ts. Criterio 3 (paginacion sobre el limite configurado, 9): blog.test.ts (pageOf), blog-source.test.ts, blog-list.test.tsx y src/app/(site)/blog/page.data.test.ts. La ruta, sin scroll horizontal en los 8 anchos y con la cabecera volviendo a la portada: e2e/blog.spec.ts. Verificado ademas con un CMS simulado en next dev: 12 publicaciones, 9 en la primera pagina y 3 en la segunda, por fecha descendente, con sus imagenes cargadas, sin scroll horizontal en 375 y 1280. PERF-004 medido el 2026-10-13: LCP 1684 a 1732 ms y 148.8 KB de JS inicial, dentro del presupuesto (detalle en el cuerpo)
- US-BLOG-03 — terminada — PR #299 (us/US-BLOG-03 a main); piezas PRs #300 (cuerpo, SEO y busqueda por slug), #301 (getBlogArticle), #302 (RichText), #303 (BlogArticleView) y #304 (la ruta /blog/<slug>), apiladas hacia us/US-BLOG-03. Criterio 1 (titulo, imagen y texto completo): ui/blog/__tests__/blog-article.test.tsx y rich-text.test.tsx, application/__tests__/rich-text.test.ts y get-blog-posts.test.ts; el contrato da una sola imagen por publicacion, la destacada. Criterio 2 (metadatos basicos de SEO): src/app/(site)/blog/[slug]/page.data.test.ts y get-blog-posts.test.ts. Criterio 3 (regreso al listado): blog-article.test.tsx y e2e/blog.spec.ts. El enlace de cada tarjeta al detalle: blog-list.test.tsx. Verificado ademas con un CMS simulado en un build de produccion: el detalle muestra titulo, imagen, encabezados, listas, cita y enlaces, sin scroll horizontal en 375 y 1280; el head trae title, description, og:title, og:description, og:image, og:type article y article:published_time; un slug inexistente sirve la pagina de no encontrada con noindex. PERF-004 medido el 2026-10-13: LCP 1676 a 1700 ms y 150.8 KB de JS inicial

### delinquency (actualizado: 2026-08-28)
- US-MOR-01 — no_iniciada
- US-MOR-02 — no_iniciada
- US-MOR-03 — no_iniciada
- US-MOR-04 — no_iniciada
- US-MOR-05 — no_iniciada

### landing (actualizado: 2026-10-15)
- US-LAND-01 — terminada — PR #49 (us/US-LAND-01 a main); piezas PRs #35 a #45; PR #58 corrige la clave closing-cta del CMS; aprobacion visual del PO el 2026-09-16 sobre las capturas del artefacto capturas-landing; el modelo hero, intro y closing-cta esta en cms.config.ts de lashary-cms y las tres claves responden 200. Pruebas: landing-hero.test.tsx, landing-home.test.tsx, site-header.test.tsx, opening-frame.test.ts, cms-reader.test.ts, landing-source.test.ts, webhook.test.ts, get-landing-content.test.ts; e2e home-hero.spec.ts, home-responsive.spec.ts, home-screenshots.spec.ts
- US-LAND-02 — terminada — PR #63 (us/US-LAND-02 a main), fusionado el 2026-10-13 sin diff: el codigo de la historia entro a main el 2026-09-23 dentro del squash del PR #109 (commit 9883af9), porque us/US-LAND-03 salio de us/US-LAND-02 y se fusiono antes que su base. Las fotos salen del CMS por la coleccion tecnicas, contrato v1.1 de docs/contracts/cms-api.md, cuya otra mitad es el PR #6 de lashary-cms (decision del PO el 2026-09-16: las imagenes van en el CMS). Criterios 1 a 5 demostrados en ui/home/__tests__/landing-techniques.test.tsx; el gateway, en content/application/__tests__/get-technique-media.test.ts, cms/__tests__/cms-reader.test.ts y cms/__tests__/webhook.test.ts. Verificado ademas contra el CMS local: fila publicada desde el panel, foto y ejemplo servidos por /api/content/tecnicas y renderizados en la landing tras el aviso firmado que invalida content:tecnicas
- US-LAND-03 — terminada — PRs #74 (contrato v1.2, coleccion galeria), #75 (lectura en content), #76 (cuadricula y filtro) y #77 (galeria ampliada y montaje), apilados hacia us/US-LAND-03; la otra mitad del contrato esta en el main de lashary-cms (3506d01). Criterios 1 y 3 en ui/home/__tests__/landing-gallery.test.tsx; 2 en content/cms/__tests__/gallery-source.test.ts y webhook.test.ts; 4 en content/application/__tests__/get-gallery.test.ts. Verificado ademas con un CMS simulado en next dev: 6 pares de 7 (el septimo sin consentimiento no aparece), sin scroll horizontal en 320, 375, 768, 1280, 1920 y 667x375, y la galeria ampliada cabe en 667x375
- US-LAND-04 — terminada — PRs #78 (contrato v1.3), #79 (validacion en content), #80 (getStudio con cache y aviso), #81 (seccion El estudio) y #82 (Por que aca, montaje y navegacion), apilados hacia us/US-LAND-04; la otra mitad del contrato esta en el main de lashary-cms (f4a4481). Criterios 1 y 2 en ui/home/__tests__/landing-studio.test.tsx y content/application/__tests__/get-studio.test.ts; 3 en content/cms/__tests__/studio-source.test.ts, webhook.test.ts y cms-reader.test.ts; 4 en landing-studio.test.tsx (Navegacion). Verificado ademas con un CMS simulado en next dev: retrato, 3 credenciales y 5 razones, sin scroll horizontal en 320, 375, 768, 1280, 1920 y 667x375; con el CMS caido, El estudio cae al respaldo y la pagina se sirve
- US-LAND-05 — terminada — PRs #83 (contrato v1.4), #84 (getLoyalty) y #85 (seccion Fidelidad, montaje y navegacion), apilados hacia us/US-LAND-05; la otra mitad del contrato esta en el main de lashary-cms (8c55f64). Criterio 1 en ui/home/__tests__/landing-loyalty.test.tsx y content/application/__tests__/get-loyalty.test.ts; criterio 2 en content/cms/__tests__/loyalty-source.test.ts y webhook.test.ts. Verificado ademas con un CMS simulado en next dev: texto, letra chica y 3 niveles ordenados por visita, sin scroll horizontal en 320, 375, 768, 1280, 1920 y 667x375. Solo informativa: el conteo de visitas es US-LAND-06
- US-LAND-07 — terminada — PRs #86 (contrato v1.5), #87 (validacion en content), #88 (getContact con cache y aviso), #89 (Ubicacion), #90 (Preguntas) y #91 (pie de pagina, montaje y navegacion), apilados hacia us/US-LAND-07; la otra mitad del contrato esta en el main de lashary-cms (6e43e3f). Criterios 1 a 3 en ui/home/__tests__/landing-location.test.tsx y content/application/__tests__/get-contact.test.ts; 4 en content/cms/__tests__/contact-source.test.ts y webhook.test.ts; 5 en ui/site-shell/__tests__/site-footer.test.tsx. Verificado ademas con un CMS simulado en next dev: sin scroll horizontal en 320, 375, 768, 860, 1024, 1280, 1920 y 667x375, la navegacion de escritorio con sus 6 enlaces entra desde 860 px, y el enlace de WhatsApp lleva el mensaje codificado

### loyalty (actualizado: 2026-08-28)
- US-LAND-06 — no_iniciada

### notifications (actualizado: 2026-10-24)
- US-NOT-01 — no_iniciada
- US-NOT-02 — no_iniciada
- US-NOT-03 — en_progreso — falta: provisión operativa fuera del código: cuenta Twilio con WhatsApp Business verificado y plantillas aprobadas por Meta (sin ellas el canal primario se declara no configurado, ADR-0006), dominio verificado en Resend, y la cuenta de staff del cron (NOTIFICATIONS_CRON_EMAIL/NOTIFICATIONS_CRON_PASSWORD) creada a mano en Supabase con rol admin/superadmin, igual que la cuenta de la administradora (US-AUTH-01). Verificación end-to-end contra un número de WhatsApp real, pendiente.
- US-NOT-04 — no_iniciada
- US-NOT-05 — no_iniciada
- US-NOT-06 — no_iniciada
- US-NOT-07 — no_iniciada
- US-NOT-08 — no_iniciada
- US-CLI-06 — no_iniciada

### payments (actualizado: 2026-10-19)
- US-AGE-13 — terminada — PR #240 (us/US-AGE-13 a main, 2026-10-13, aprobado); piezas #219 a #239 y #241 hacia us/US-AGE-13. Criterio 1, anticipo por tecnica: columna deposit de catalog_techniques (US-AGE-08), formulario y tabla del panel; pruebas catalog/domain/techniques/__tests__/technique.test.ts, ui/techniques/__tests__/technique-schema.test.ts y catalog_staff_write.test.sql. Criterio 1, anticipo por paquete: migraciones 20261004000001 y 20261004000002, RPC de guardado, dominio, formulario y listado; pruebas application/packages/__tests__/package-deposit.test.ts, ui/packages/__tests__/package-deposit-form.test.tsx, db/packages/__tests__/package-deposit-repository.test.ts y catalog_package_deposit.test.sql. Criterio 5, exoneracion con bitacora: exemptClient registra payments.deposit_exemption.granted en audit_events; pruebas payments/application/__tests__/exempt-client.test.ts, rls-isolation.test.ts, payments_staff_access.test.sql y payments_exemption_history.test.sql (la FK a clients_profiles es RESTRICT, ADR-0009). Verificado en el CI de main del 2026-10-14: las 6 suites pgTAP (87 aserciones) y las 113 de vitest en verde. Los criterios originales 2 y 3 son de US-AGE-05 y el 4 de US-AGE-12 (PO, 2026-10-03). #240 se fusiono con el check reglas en rojo por INT-008 (5 migraciones en un PR) y sin la etiqueta excepcion-proceso. Confirmada terminada por el PO el 2026-10-14

### platform (actualizado: 2026-09-16)

### scheduling (actualizado: 2026-10-20)
- US-AGE-01 — terminada — PR de cierre us/US-AGE-01 a main, con las piezas 1 a 13 apiladas hacia la rama de la historia. Criterios 1, 2 y 3 demostrados en /admin/citas/disponibilidad; los criterios 4 y 5 se trasladaron a US-AGE-02 y US-AGE-05 con aprobación del PO el 2026-10-14 (docs/process/DEPENDENCIES.md); tests: weekly-availability.test.ts (domain y application), closed-dates.test.ts (domain y application), manual-blocks.test.ts (domain y application), los tres *-repository.test.ts, studio-time.test.ts, availability-schema.test.ts, availability-actions.test.ts, availability-format.test.ts, AdminAvailabilityView.test.tsx, __tests__/availability-rls-isolation.test.ts (SEC-002) y pgTAP scheduling_weekly_availability.test.sql y scheduling_closed_dates_and_manual_blocks.test.sql
- US-AGE-02 — terminada — PR de cierre us/US-AGE-02 a main (#403), con las piezas 1 a 12 apiladas hacia la rama de la historia (#387 a #392 y la pila de correcciones de la revisión #397 a #402). SLOT_INTERVAL_MIN = 30 confirmado por el PO el 2026-10-18. Criterios 1 a 5 y el criterio 4 recibido de US-AGE-01 con prueba unitaria; tests: domain/__tests__/day-slots.test.ts (criterios 1, 2, 3 y 5), domain/__tests__/service-option.test.ts (criterio 5), application/__tests__/day-slots.test.ts (criterio 4 de US-AGE-01), db/__tests__/day-availability-repository.test.ts, ui/client-calendar/__tests__/ClientCalendarView.test.tsx (criterios 1, 3 y 4), ui/client-calendar/__tests__/load-client-calendar.test.ts, ui/client-calendar/__tests__/calendar-params.test.ts, ui/client-calendar/__tests__/client-calendar-format.test.ts, ui/__tests__/TechniqueSelector.test.tsx (enlace desde el selector de US-AGE-03), shared/__tests__/studio-time.test.ts (addCalendarDays), __tests__/availability-rls-isolation.test.ts (las dos funciones con tokens reales, SEC-002), pgTAP supabase/tests/database/scheduling_client_day_view.test.sql (criterios 2 y 3 en la base, RLS intacta, anon sin acceso y criterio 4 de US-AGE-01), corrida en local el 2026-10-18; verificada en navegador el 2026-10-17 con Playwright contra Supabase local (escritorio y 375 px, capturas en el PR de la pieza 6)
- US-AGE-03 — terminada — criterios 1, 3 y 4 demostrados; el criterio 2 se trasladó a US-AGE-05 con aprobación del PO (líder del proyecto), comunicado por Erick Duran el 2026-10-17 (docs/process/DEPENDENCIES.md, Criterios trasladados, ítem 6); tests: technique-selection.test.ts, select-technique.test.ts, load-technique-selection-page.test.ts, TechniqueSelectionPageView.test.tsx
- US-AGE-04 — no_iniciada
- US-AGE-05 — terminada — PR de cierre us/US-AGE-05 a main (#411), con 25 piezas apiladas hacia la rama de la historia (#412 a #441). Criterios 1, 3, 4, 5, 6, 8 y 9, el criterio 5 recibido de US-AGE-01 y la prueba obligatoria de concurrencia demostrados. Los criterios 7 y 10 se entregan parciales, con aprobación del PO (docs/process/DEPENDENCIES.md, registro del 2026-10-19): el aviso del anticipo es genérico, sin la ventana de cancelación (cifra con US-AGE-06), y la detección contra el historial no tiene citas completadas hasta US-AGE-12 ni campo para que la administradora corrija el anticipo (US-MOR-03). El criterio 2 (morosidad) se trasladó a US-MOR-02, aprobado por el PO y por KthArg (docs/process/DEPENDENCIES.md, Criterios trasladados, ítem 7). Faltantes con dueño en la sección «Faltantes de US-AGE-05» de este SPEC. Tests: scheduling_book_appointment, scheduling_appointment_frozen_terms, scheduling_quote_booking, scheduling_detected_first_time, scheduling_booking_limits, scheduling_clients_contract, scheduling_alerts y scheduling_affected_appointments (pgTAP); booking-concurrency.integration.test.ts y booking-pending-limit.integration.test.ts; book-appointment.test.ts, perform-booking.test.ts, BookingConfirmView.test.tsx, ApprovalQueue.test.tsx, availability-actions.test.ts y alerts.test.tsx
- US-AGE-06 — no_iniciada
- US-AGE-07 — no_iniciada
- US-AGE-09 — terminada — criterios 1 a 4 y el flujo de aprobación (ADR-0003) demostrados; tests: supabase/tests/database/scheduling_no_overlap.test.sql (criterios 1 a 3), db/__tests__/appointment-concurrency.integration.test.ts (criterio 4, 10 reservas simultáneas por ronda, 3 rondas), supabase/tests/database/scheduling_create_appointment.test.sql, supabase/tests/database/scheduling_decide_appointment.test.sql, application/__tests__/create-appointment.test.ts, application/__tests__/decide-appointment.test.ts, db/__tests__/appointment-repository.test.ts, db/__tests__/appointment-decision-repository.test.ts, ui/approval-queue/__tests__/approval-queue-actions.test.ts, ui/approval-queue/__tests__/ApprovalQueue.test.tsx, __tests__/rls-isolation.test.ts. Criterio 5, parte de código: error tipado SpaceNotAvailable y evento scheduling.appointment_overlap_rejected (db/appointment-repository.ts). La alerta real se traslada a US-AGE-05 (docs/process/DEPENDENCIES.md, Criterios trasladados, ítem 4)
- US-AGE-10 — no_iniciada
- US-AGE-11 — no_iniciada
- US-AGE-12 — no_iniciada

### store (actualizado: 2026-10-14)
- US-PROD-02 — terminada — PRs #92, #93 (grid publico), #123 a #133 (panel admin, criterio 3) y el PR de cierre us/US-PROD-02 a main (prueba del criterio 2); tests: store.test.tsx (criterios 1 y 2), product.test.ts, commands.test.ts, queries.test.ts, product-schema.test.ts, product-actions.test.ts, layout.test.tsx, products-admin-rls.test.ts (omitida sin Supabase local, ver deuda)
- US-PROD-03 — terminada — PR #271 (pieza 8/8, cierra la historia) y las piezas #198, #200, #265, #266, #267, #269 y #270; tests: product-detail-page.test.tsx (criterios 1, 2 y 3: imagen, nombre, descripcion, precio, boton de agregar al carrito y aviso Agotado con la compra deshabilitada), store.test.tsx (enlace desde el grid), product-detail.test.ts, get-public-product-detail.test.ts, public-product-detail-db.test.ts, product-image.test.ts, product-images.test.ts, product-actions.test.ts, product-images-storage-rls.test.ts (omitida sin Supabase local, ver deuda)
- US-SHOP-01 — terminada — PR de la pieza 8/8 (cierra la historia) y las piezas #306, #308, #310, #323, #324, #339 y #340; tests: add-to-cart-from-detail.test.tsx y cart-contents.test.tsx (criterio 1: agregar desde el detalle, sumar, restar y quitar), cart-contents.test.tsx (criterio 2: cantidad, total y subtotal cambian antes de que responda el servidor), cart-repository-db.test.ts (criterio 3: el carrito persiste entre conexiones de la misma clienta), cart-page.test.tsx, cart-actions.test.ts, cart-use-cases.test.ts, cart.test.ts, cart-items-rls.test.ts y store_cart_items_active_product.test.sql (SEC-002)
- US-SHOP-02 — no_iniciada

## Bloqueos

Ninguno.

## Defectos conocidos

Ninguno registrado.

## Deuda aceptada
- auth: Test de aislamiento RLS contra instancia local de Supabase en CI — aceptada en PR #3 — costo: 2h
- auth: La política clients_profiles_select_own deja a la clienta leer su fila completa, notes incluido, llamando a PostgREST directo; findClientProfile ya no las pide pero la base no lo impide — aceptada en PR #273 — costo: migración de privilegios por columna o vista para la clienta, más decisión del PO sobre si notes debe ser legible por ella
- clients: Prueba de aislamiento RLS (SEC-002) de las politicas de administradora de clients_profiles (supabase/migrations/20260911000000_clients_profiles_admin_access.sql): las pruebas simulan Supabase y no demuestran que una clienta con token valido no pueda leer, crear ni editar a otras — aceptada en PR #32, etiqueta excepcion-proceso — costo: 3h: arnes de Supabase local en CI y el test con token de clienta contra SELECT, INSERT y UPDATE; 1h si ya existe el arnes de la deuda de auth (PR #3)
- clients: M2 de la auditoria de US-CLI-04: escribir el expediente guarda la version y despues audita, sin transaccion. Si la bitacora falla, el cambio queda sin evento; la pantalla lo avisa como saved-without-audit — aceptada en Auditoria del 2026-10-19, por decision de Jose Loria; mismo pendiente heredado de US-AGE-13 — costo: 4h: funcion SQL que inserte version y evento en una transaccion, con contrato pactado con audit (INT-003), y su pgTAP
- clients: M3 de la auditoria de US-CLI-04 (riesgo aceptado): una admin con su token puede leer clients_record_versions directo por PostgREST sin pasar por readRecord, y esa lectura no queda en la bitacora (SEC-006 se cumple solo dentro de la app) — aceptada en Auditoria del 2026-10-19, riesgo aceptado por Jose Loria — costo: 6h: quitar el SELECT directo y leer por una funcion SECURITY DEFINER que registre el acceso y devuelva las versiones, con pgTAP
- clients: Resto de M4 de la auditoria de US-CLI-04: si guardar la version falla despues de subir la imagen (choque de versiones o caida), el archivo queda en el bucket privado sin version que lo use, y no se puede borrar porque el bucket no tiene politica de DELETE — aceptada en Auditoria del 2026-10-19, por decision de Jose Loria; el cupo de 20 ya se revisa antes de subir — costo: 3h: limpieza programada fuera de la app que borre objetos sin version de mas de un dia
- clients: B4 de la auditoria de US-CLI-04: rowToVersion revalida cada version con las reglas vigentes; si un tope se endurece o una fila quedo rara, el expediente entero no abre — aceptada en Auditoria del 2026-10-19, por decision de Jose Loria — costo: 2h: leer el historial sin revalidar topes (solo la forma) y validar solo al escribir
- notifications: db/reminder-repository.ts no tiene prueba de integración propia contra Supabase local (a diferencia de scheduling/payments); su contrato real (insertIfAbsent idempotente, reschedulePending/cancelPending solo sobre pending, markRetry/markExhausted) se verificó manualmente aplicando la migración y corriendo supabase/tests/database/notifications_reminders_staff_access.test.sql, pero ese pgTAP no ejercita el repositorio TypeScript, solo SQL+RLS directo — aceptada en PR de cierre us/US-NOT-03 a main — costo: 2h: *.integration.test.ts con pg para promover una sesión de prueba a staff (igual que scheduling/payments) y ejercitar las siete operaciones del repositorio contra una base real
- store: Prueba de aislamiento RLS (SEC-002) de las politicas store_products_*_admin (supabase/migrations/20260912000000_store_products.sql): src/features/store/__tests__/products-admin-rls.test.ts se omite con describe.skipIf cuando no hay Supabase local, y CI no lo levanta, asi que no demuestra que anon y una clienta sin rol de staff no puedan INSERT, UPDATE ni DELETE — aceptada en PR de cierre us/US-PROD-02 a main — costo: 1h si ya existe el arnes de Supabase local en CI de la deuda de auth (PR #3); 3h si no: arnes mas correr la suite existente en CI
- store: Prueba de aislamiento (SEC-002) del bucket store-product-images: src/features/store/__tests__/product-images-storage-rls.test.ts se omite sin Supabase local y CI no lo levanta, asi que no demuestra que anon y una clienta no puedan subir, listar ni borrar — aceptada en PR de la pieza US-PROD-03 1/8 — costo: el mismo arnes de la deuda anterior; con el arnes, 0h extra
- store: Las server actions de Next aceptan 1 MB por defecto y next.config.js no lo cambia: una imagen de entre ~1 MB y 2 MB pasa validateProductImage pero Next corta la peticion antes con un error generico; el formulario dice 'hasta 1 MB' — aceptada en PR de la pieza US-PROD-03 8/8 — costo: 1 linea en next.config.js (experimental.serverActions.bodySizeLimit '3mb') y cambiar el texto del campo; decision pendiente de investigar

## Flags vivos

Ninguno.

## Historias del backlog sin feature que las reclame

Ninguna: toda historia del backlog tiene feature.
