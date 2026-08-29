# Herramientas externas — candidatas evaluadas (§ política SEC-008)

> **Autoridad:** el inventario de herramientas externas evaluadas y su veredicto sugerido. La adopción real de cada una exige: `/auditar-herramienta`, entrada en el allowlist con hash, versión pinneada, y PR revisado. **Nada de esta lista está instalado.** **Lectores:** PO y equipo al decidir tooling; `lashary-seguridad`. **Estado:** propuesta — el PO aprueba o descarta por fila. **Actualizado:** 2026-08-28.

Veredictos: **adoptar-F0/F1** (entra con las historias fundacionales) · **evaluar** (prometedora, decisión con más datos) · **ahora no** (descartada por ahora, con motivo). Sin versiones citadas a propósito: se pinnean al auditar, no aquí.

## Seguridad

| Herramienta | Qué hace / qué aporta | Permisos | Riesgo específico | Veredicto |
|---|---|---|---|---|
| **gitleaks** | Escáner de secretos maduro, cientos de patrones. Reemplaza los patrones artesanales de `check-secrets.sh` (SEC-003/004), que se quedan cortos por diseño | Lee el repo en CI | Binario externo en CI; falsos positivos iniciales que hay que calibrar | **adoptar-F0** |
| **Dependabot (security updates)** | Nativo de GitHub: alerta CVEs y abre PRs de arreglo. Cada update = diff legible en PR — compatible con "nada se auto-actualiza": abre PRs, no mergea | Ya está en GitHub | Ruido de PRs; configurar solo-seguridad para no ahogar | **adoptar-F0** |
| **Supabase CLI** | Entorno local + migraciones versionadas + base para los tests de aislamiento RLS (SEC-002, INT-008). Sin ella, los tests RLS en CI son mucho más difíciles | Local + CI; sin credenciales de prod | Es EL vector con acceso a la base local; jamás apuntarla a prod desde CI | **adoptar-F0** (prácticamente obligatoria para el harness RLS de SEC-002) |
| **Semgrep (reglas OSS)** | SAST con reglas para JS/TS: inyección, uso inseguro de APIs. Cubre lo que grep no entiende sintácticamente | Lee el repo en CI | Motor + reglas de terceros que se actualizan: pinnear ambas; ruido inicial | **evaluar** (tras F1, con código real que escanear) |
| **CodeQL** | Análisis semántico profundo, nativo GitHub | GitHub | Gratis solo en repos públicos; en privado exige plan pago — decisión de PO según visibilidad del repo | **evaluar** (depende de si el repo es público) |
| **Socket** | Análisis de comportamiento de dependencias (postinstall nuevos, red, maintainer) — justo la señal SEC-008 que el agente deps-audit busca a mano | App de GitHub, lee manifiestos | SaaS tercero leyendo el repo; solapa con deps-audit — elegir uno como fuente primaria | **evaluar** |

## Rendimiento

| Herramienta | Qué hace / qué aporta | Permisos | Riesgo específico | Veredicto |
|---|---|---|---|---|
| **Lighthouse CI** | PERF-004 medible y bloqueante: LCP y presupuesto por página pública en cada PR. Es la graduación L4→L1 del `/presupuesto` | Corre Chrome headless en CI | Tiempo de build; flakiness de métricas — usar medianas de ×3 | **adoptar-F1** (cuando exista la landing) |
| **@next/bundle-analyzer** | Visualiza qué infla el bundle; la otra mitad de PERF-004 | Dev-dependency local | Mínimo; oficial de Next | **adoptar-F1** |
| **explain.dalibo.com** | Visualizador web de `EXPLAIN ANALYZE` para `/medir` — planes de Postgres legibles | Ninguno (se pega el plan a mano) | **Nunca pegar planes con datos reales de clientas** — solo sobre seeds | **adoptar** (uso puntual, sin instalación) |
| **Vercel Speed Insights** | Métricas de usuarios reales (RUM) en producción | Script en la página | Costo según plan; datos de visitantes a un tercero — revisar con la política de privacidad del sitio | **evaluar** (post-lanzamiento) |
| *(nota)* `next/image` | La optimización de imágenes de la landing (PERF-004) ya viene en Next — no requiere herramienta externa | — | — | usar, no instalar |

## UI / UX / estética

| Herramienta | Qué hace / qué aporta | Permisos | Riesgo específico | Veredicto |
|---|---|---|---|---|
| **eslint-plugin-jsx-a11y** | UI-004 estático en el linter: labels, alt, roles. Viene con la config ESLint de Next — activarlo en modo estricto es casi gratis | Linter local/CI | Mínimo | **adoptar-F1** |
| **@axe-core/playwright** | UI-004 dinámico: contraste real renderizado, foco, ARIA — lo que el linter no ve. Graduación del `/revisar-accesibilidad` | Corre con los E2E en CI | Falsos positivos moderados; requiere Playwright | **adoptar-F1** |
| **eslint-plugin-tailwindcss** | Ordena clases y **veta valores arbitrarios** — UI-002 en el editor, antes que el grep de CI | Linter | Compatibilidad con la versión de Tailwind: verificar al auditar | **adoptar-F1** |
| **Playwright** (+ `toHaveScreenshot`) | E2E de los flujos UX críticos (reservar, cancelar, regularizar) + regresión visual por screenshots **sin SaaS**: la estética no se rompe sin que un diff lo muestre | CI | Screenshots frágiles ante cambios legítimos — limitar a páginas clave | **adoptar-F1** (E2E); screenshots **evaluar** tras estabilizar el tema |
| **daisyUI theme generator** (web oficial) | Construir el tema del estudio (paleta completa con roles semánticos) que `/revisar-tema` audita | Ninguno — genera config que se pega | Ninguno real | **adoptar** (uso puntual) |
| **Fontsource** | Fuentes self-hosted como paquete npm: tipografía de marca sin pedir nada a Google en runtime (privacidad + PERF-004) | Dependencia | Mínimo; pinnear como todo | **adoptar-F1** (al elegir tipografía; `next/font` es la alternativa integrada — decidir una) |
| **Storybook** | Catálogo vivo de componentes; ancla el "patrón del catálogo" de UI-001/003 | Dev-dependency pesada | Infra grande para 1 app y 6 devs; costo de mantenimiento real | **evaluar** (solo si el catálogo propio crece más allá de DaisyUI) |
| **Chromatic / Percy** | Regresión visual SaaS | SaaS con el repo | Pago; los screenshots de Playwright cubren la necesidad a costo cero | **ahora no** |
| **Microsoft Clarity / Hotjar** | Analítica de comportamiento (heatmaps, grabaciones de sesión) para UX | Script que graba a las visitantes | **Grabar sesiones de clientas de un negocio de belleza roza el expediente en espíritu (SEC-006)** y el sitio agenda citas reales; consentimiento y anonimización no triviales | **ahora no** — reabrir solo con caso UX concreto y aval del PO |
| **Tokens Studio (Figma)** | Sincroniza tokens de diseño Figma↔código | Plugin Figma | Solo útil si el equipo diseña en Figma — flujo hoy inexistente | **ahora no** |

## Cómo se adopta una (resumen de la política)

1. `/auditar-herramienta <nombre>` — checklist SEC-008 completo; ofuscado = rechazo.
2. PR de alta: versión pinneada (por SHA donde aplique), entrada en `docs/spec/tooling-allowlist.yaml` con hash, revisor humano.
3. `check-tooling-hash.sh` la vigila desde entonces; cambio de maintainer = re-review desde cero.
