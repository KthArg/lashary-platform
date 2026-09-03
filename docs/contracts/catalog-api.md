# Contrato — API pública del catálogo

> **Autoridad:** qué expone la feature `catalog` para el resto de la plataforma y bajo qué garantías. Es un contrato **de demanda**: nace de los criterios del backlog (US-AGE-08, y lo que consumen US-LAND-02, US-AGE-02, US-AGE-03, US-AGE-05). Se versiona aquí antes de cualquier cambio de forma (INT-003). **Lectores:** features `landing`, `scheduling`. **Estado:** borrador — se fija con la implementación de US-AGE-08. **Actualizado:** 2026-09-01.

## Qué es el catálogo

El conjunto de **técnicas** que ofrece el estudio, con sus tiempos, precios, anticipo y texto de cuidados. Administrado por la administradora (US-AGE-08). Dato compartido de un solo estudio: no hay catálogo por-clienta.

Tabla dueña: `catalog_techniques` (feature `catalog`, ARCH-006). Ninguna otra feature la consulta directamente (ARCH-005) — todo acceso pasa por el entry point `src/features/catalog/index.ts` (ARCH-003).

## Superficie expuesta (`src/features/catalog/index.ts`)

### `listTechniques(params) => Promise<Page<TechniqueView>>`

```ts
type ListTechniquesParams = {
  activeOnly?: boolean   // default true — las nuevas reservas solo ven activas (criterio 7a)
  page?: number          // default 1
  pageSize?: number      // default 50, máx 100 (PERF-002)
}
type Page<T> = { items: T[]; page: number; pageSize: number; total: number }
```

- Consumidores: **US-LAND-02** (sitio público: imagen/descripción vienen del CMS, precio y duración vienen de aquí — el precio nunca vive en el CMS), **US-AGE-03** (selección de técnica al agendar).
- Ordena por `family`, luego `name`.

### `getTechnique(id) => Promise<TechniqueView | TechniqueNotFound>`

- Consumidor: **US-AGE-05**. Al confirmar una cita, `scheduling` **copia** un `TechniqueSnapshot` dentro de la cita. A partir de ese momento la cita no depende del catálogo (DOM-002).

### Tipos

`Technique` es la entidad de dominio (usa el value object `Money` internamente) y **no** cruza la frontera de la feature. Lo que se exporta es `TechniqueView` — la misma forma con montos en colones enteros.

```ts
type ServiceFamily =
  | 'lash_classic' | 'lash_volume' | 'lash_extra_volume'
  | 'brow_design' | 'brow_lamination'
  | 'henna' | 'waxing' | 'lips'

type TechniqueView = {
  id: string
  name: string
  family: ServiceFamily
  priceFirstTime: number            // colones enteros, CRC (DOM-001)
  priceRetouch: number | null       // null = sin retoque
  durationFirstTimeMin: number
  durationRetouchMin: number | null // no-null sii priceRetouch no-null (D10)
  bufferMin: number                 // preparación + limpieza; ocupa calendario, no se cobra
  reapplicationIntervalDays: number | null
  deposit: number                   // anticipo requerido, colones enteros (DOM-001)
  aftercareText: string
  isActive: boolean
}

// Lo que la cita copia al confirmarse (DOM-002). Subconjunto estable de TechniqueView.
type TechniqueSnapshot = {
  techniqueId: string
  name: string
  family: ServiceFamily
  priceFirstTime: number
  priceRetouch: number | null
  durationFirstTimeMin: number
  durationRetouchMin: number | null
  bufferMin: number
  deposit: number
}
```

`create` / `update` / `deactivate` **no** son parte del contrato público: son operaciones de administración, viven dentro de `catalog/ui/` y hoy están cubiertas por el flag `catalog_admin_write` (ver [SPEC](../../src/features/catalog/SPEC.md)).

## Garantías

1. **El precio y el anticipo son la fuente única.** Ninguna otra feature ni el CMS los duplica. Un solo lugar por hecho.
2. **`getTechnique` devuelve técnicas activas e inactivas.** Una técnica desactivada sigue siendo resoluble por `id` para que `scheduling` pueda mostrar citas históricas (aunque `scheduling` debería usar su propio snapshot, no re-leer).
3. **Nunca se borra una técnica.** Desactivar es `is_active = false`. No hay `DELETE`.
4. **El `id` es estable** entre ediciones.
5. **Cambios de forma de este contrato se versionan aquí antes del cambio** (INT-003): un campo no desaparece sin aviso; `scheduling` y `landing` se enteran por este documento.
6. **Autorización real por RLS** (SEC-001): la lectura es pública; la escritura la controla la base, no la app.

## Eventos de dominio

Ninguno todavía. Desactivar una técnica **no** notifica a `scheduling`: las citas ya agendadas llevan su propio `TechniqueSnapshot` y no se ven afectadas (DOM-002). Si una futura historia necesita reaccionar a cambios del catálogo, se agrega aquí un evento (ARCH-005: primero evento, después use-case).

## Pendientes

- La función `public.auth_is_staff()` la aporta `auth` (US-AUTH-01/02). Hasta entonces la escritura de `catalog_techniques` está denegada por RLS (fail-closed) y el flag `catalog_admin_write` lo registra.
- Al implementarse US-AGE-05, confirmar que `TechniqueSnapshot` cubre todo lo que la cita necesita congelar; si falta un campo, se agrega aquí primero.
