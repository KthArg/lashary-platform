# ADR-0008 — Sin `class` en código nuevo: interfaces y funciones

> **Estado:** aceptado. **Fecha:** 2026-09-28. **Decisores:** equipo de desarrollo.

## Contexto

`src/shared/` ya mezclaba dos estilos: `result.ts` es tipos + funciones puras (`ok`, `err`, `isOk`), mientras `money.ts` y `domain-error.ts` son clases. Las features copiaron el estilo de clase para entidades (`Technique`), jerarquías de error (`CatalogError` y subtipos) y adaptadores (`SupabaseTechniqueRepository`), sin que ninguna regla ni ADR lo hubiera decidido.

US-PROD-01 (paquetes) migró todo su código a interfaces y funciones como referencia — PR #134 — sin cambiar comportamiento: los mismos 88 tests pasaron antes y después. Esa migración es el ejemplo a seguir.

## Decisión

El código nuevo no declara `class`. Cada caso tiene su forma:

| Antes | Ahora |
|---|---|
| Entidad: `class X { private constructor; static create() }` | `interface X { readonly campo: T }` + función `createX(input): Result<X, XError>` que aplica los invariantes (DOM-007). Es la única forma de obtener un `X`. |
| Comportamiento: `x.deactivate()`, `x.toView()` | Funciones puras con `x` como primer parámetro: `deactivateX(x)`, `xToView(x)`. |
| Error: `class XError extends CatalogError` | `interface XError { code: 'X_ERROR'; message: string; … }` + fábrica `xError(…)` + guarda de tipo `isXError(e): e is XError`. DOM-006 se cumple igual: errores tipados, discriminados por `code`, sin herencia. |
| `error instanceof XError` | `isXError(error)` — también en tests, en vez de `toBeInstanceOf`. |
| Adaptador / repositorio: `class SupabaseXRepository implements XRepository` | `createSupabaseXRepository(db): XRepository` — función que devuelve un objeto que implementa el puerto. Los puertos ya eran `interface` y siguen igual. |
| Estado mutable de un fake de test (`this.saveCalls++`) | Variable en el cierre de la fábrica y un getter en el objeto devuelto (`get saveCalls()`); los tests que lo leen no cambian. |

Los built-ins de JavaScript (`Error`, `Map`, `Set`, `Date`) se siguen usando: la decisión es no **declarar** clases propias.

## Alternativas consideradas

- **Seguir con clases.** Descartada: deja a `shared/` con dos estilos y a cada persona eligiendo uno distinto por feature.
- **Hacerlo cumplir con ESLint (`no-restricted-syntax: ClassDeclaration`).** Sería la contraparte determinista natural, pero el repo no tiene ESLint configurado hoy. Queda como opción si se agrega el linter.
- **Un check propio en CI.** Descartado por decisión del equipo: esto es una decisión de arquitectura, no una regla de `rules.yaml`. La verifica el revisor humano (checkbox del PR template) y la IA la sigue porque está en `.agents/AGENTS.md` y en la skill `lashary-desarrollo`.

## Consecuencias

- **Ganamos:** un solo estilo en todo el repo, el mismo de `result.ts`; entidades que son datos planos serializables; narrowing de errores sin depender de la cadena de prototipos.
- **Perdemos / aceptamos:** un `throw` de un error que ya no es clase lanza un objeto plano — sin `stack` y sin `instanceof Error`. Donde se lanza a propósito (hoy solo `PackageNameConflict`, que mapea el `23505` de Postgres), se atrapa en el mismo borde de `application/` y se convierte a `Result`, así que no se pierde información útil.
- **Obligatorio desde hoy:** ningún PR agrega una `class` nueva.
- **Migración pendiente.** Las clases que ya existían se migran cuando se trabaje su historia, no en un PR aparte que toque todo:

| Historia | Archivos | Clases |
|---|---|---|
| US-AGE-08 | `catalog/domain/technique.ts`, `catalog/domain/errors.ts`, `catalog/db/technique-repository.ts`, `catalog/application/__tests__/fake-repository.ts` | `Technique`, `CatalogError`, `TechniqueValidationError`, `TechniqueNotFound`, `TechniqueNameConflict`, `SupabaseTechniqueRepository`, `FakeTechniqueRepository` |
| US-LAND-01 | `content/domain/errors.ts` | `CmsUnavailable` |
| US-PROD-02 | `store/db/productos-db.ts`, `store/http/catalogo-productos-cms.ts` | `CatalogoProductosDb`, `CatalogoProductosCms` |
| — (`shared/`) | `shared/money.ts`, `shared/domain-error.ts` | `Money`, `DomainError` — **al final**: son la base de las demás (`CatalogError` y `CmsUnavailable` extienden `DomainError`). |

  `FakeTechniqueRepository` también lo usan los tests de US-PROD-01 (`package-commands.test.ts`): migrarlo toca tests de las dos historias.

- **Lecciones de #134, para quien migre:**
  - Un cambio de interfaz **no se parte por capas**: cambiar los exports de `domain/` en un PR y sus consumidores (`application/`, `db/`, `ui/`) en otro deja el primero sin compilar. Si todo junto supera las ~400 líneas de INT-002, se pide la excepción (`excepcion-proceso`) en vez de partirlo.
  - Antes de sacar un error de la jerarquía de `DomainError`, buscar `instanceof DomainError` / `instanceof CatalogError` genéricos: si alguno existe, depende de esa herencia.
  - Lo que deja de tener valor en runtime se exporta con `export type` desde `index.ts`; si no, TypeScript falla con `TS2693`.
