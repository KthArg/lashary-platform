# lashary-platform

> **Autoridad:** punto de entrada del repositorio; enruta hacia todo lo demás. No contiene hechos propios.
> **Lectores:** cualquier persona o IA que llega al proyecto. **Estado:** vigente. **Actualizado:** 2026-08-27.

Plataforma de gestión de clientas y agendamiento para **LASHARY Beauty Studio** — un único estudio de belleza. No es multi-tenant, no es SaaS, no es multi-sede.

## Por dónde empezar

| Si vas a… | Lee |
|---|---|
| Retomar trabajo o saber dónde está el proyecto | [docs/STATUS.md](docs/STATUS.md) — **siempre primero**. Generado, nunca editado a mano |
| Trabajar con IA (Claude u otro agente) | [.agents/AGENTS.md](.agents/AGENTS.md) |
| Conocer el alcance comprometido | [docs/backlog/](docs/backlog/) — export de Jira vigente, fuente de registro |
| Ver el orden del trabajo | [docs/ROADMAP.md](docs/ROADMAP.md) y [docs/process/DEPENDENCIES.md](docs/process/DEPENDENCIES.md) |
| Escribir código | [docs/process/WORK_LOOP.md](docs/process/WORK_LOOP.md) — el bucle es obligatorio, no opcional |
| Consultar una regla | [docs/spec/rules.yaml](docs/spec/rules.yaml) — índice; el texto vive en `docs/spec/*.md` |
| Entender una decisión | [docs/adr/](docs/adr/) |
| Adoptar una herramienta externa | [docs/tooling-candidates.md](docs/tooling-candidates.md) — evaluadas; el alta pasa por `/auditar-herramienta` |
| Entender una feature | `src/features/<nombre>/SPEC.md` |

## Reglas del juego, en cinco líneas

1. Especificamos antes de codificar; el trabajo se organiza en rebanadas verticales de funcionalidad y sprints de dos semanas.
2. Toda regla tiene un ID permanente (`ARCH-003`, `SEC-001`…) y un racional. CI las hace cumplir donde es posible; ver [docs/spec/rules.yaml](docs/spec/rules.yaml).
3. El estado del proyecto vive en el repositorio, generado desde los `SPEC.md`; un `STATUS.md` desactualizado rompe el build.
4. Trunk-based: ramas de máximo 3 días, un PR por tarea, contrato primero cuando dos features se tocan.
5. La frontera real de autorización es RLS en Supabase; la de no-solape de citas, un exclusion constraint en PostgreSQL. Lo que la aplicación valida es cortesía.

## Stack

Next.js (App Router) · Supabase (PostgreSQL, Auth, RLS, Storage) · Tailwind CSS + DaisyUI · CMS propio externo vía API ([ADR-0001](docs/adr/ADR-0001-external-cms.md)) · Vercel + GitHub Actions.
