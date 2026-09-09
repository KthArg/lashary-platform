# ADR-0008 — Estructura de `ui/` dentro de cada feature

> **Estado:** aceptado. **Fecha:** 2026-09-09. **Decisores:** equipo de desarrollo (con asistencia de Claude).

## Contexto

`docs/spec/ARCHITECTURE.md` documenta un único folder de borde por feature (`http/` `ui/` — "borde: validación, mapeo de errores, componentes"), sibling de `domain/`, `application/` y `db/`. No especifica cómo organizar el contenido *dentro* de ese folder.

Las dos features con código real hoy en el repo resolvieron esto cada una por su cuenta, de formas incompatibles:

- **`auth`** puso `components/<Nombre>/{<Nombre>.tsx, .styles.ts, .types.ts, index.ts}`, `hooks/`, `constants/` y `actions/` como carpetas **al nivel raíz de la feature**, fuera de cualquier `ui/`. `constants/auth-strings.ts` contiene texto visible al usuario (labels, botones, mensajes de error), no valores de configuración. Los tests viven en un único `__tests__/` a nivel de feature (`admin-auth.test.tsx`, `auth-client.test.tsx`), no junto a cada componente.
- **`catalog`** puso todo plano dentro de un solo `ui/`: `AdminCatalogPage.tsx`, `TechniqueTable.tsx`, `technique-form.tsx`, `messages.ts`, `schema.ts`, `actions.ts`, `action-state.ts`, `format.ts` (560 líneas en total, medido 2026-09-09). Las clases de Tailwind/DaisyUI van inline en el JSX (`className="table table-zebra"`), sin archivo de estilos separado. Los tests de lógica no-componente están en `ui/__tests__/`.

Ninguna de las dos sigue `ARCHITECTURE.md` al pie de la letra: `catalog` respeta la ubicación del folder (`ui/`) pero no organiza su interior; `auth` organiza mejor cada componente pero sacó las carpetas del folder documentado.

Reglas ya existentes que tocan parte de este problema, verificadas en `docs/spec/rules.yaml`:

- **UI-002** (tokens, no valores arbitrarios) — `ci_status: implementado`, pero el script (`check-ui-tokens.sh`) solo prohíbe valores arbitrarios tipo `bg-[#fff]`; no prohíbe clases normales de Tailwind/DaisyUI inline en el JSX en vez de un archivo de estilos.
- **DOM-009** (texto de UI externalizado) — existe en el catálogo, pero `ci_status: planificado_f6`: el lint de literales en JSX no está construido todavía. Hoy solo un humano/IA en revisión atrapa un string hardcodeado.
- No existe ninguna regla con ID propio sobre separar lógica de estado (hooks) del render, ni sobre magic numbers/strings de configuración.

## Decisión

Toda feature organiza su `ui/` así:

```
src/features/<feature>/ui/
├── components/
│   └── <Nombre>/
│       ├── <Nombre>.tsx
│       ├── <Nombre>.styles.ts
│       ├── <Nombre>.types.ts
│       ├── __tests__/<Nombre>.test.tsx
│       └── index.ts
├── hooks/
│   └── use<Algo>.ts
├── constants.ts       (o carpeta constants/ si hay más de un grupo)
├── messages.ts
├── schema.ts
├── actions.ts / action-state.ts
├── format.ts
└── __tests__/
```

Reglas de contenido:

1. Todo el borde de frontend vive dentro de `ui/` — ninguna carpeta (`components/`, `hooks/`, `constants/`) al nivel raíz de la feature.
2. Cada componente con lógica o estado propio recibe su propia carpeta con estilos (`.styles.ts`) y tipos (`.types.ts`) separados del JSX; nada de clases largas inline en el `.tsx`.
3. `constants.ts` contiene valores fijos que **no son texto de usuario** (roles, límites, timeouts). `messages.ts` contiene **todo** el texto visible (DOM-009). Un valor usado en un solo archivo puede quedarse declarado ahí mismo, arriba del archivo, sin necesidad de `constants.ts`.
4. La lógica de estado/efectos de un componente sale a `hooks/`; el `.tsx` recibe props y solo compone JSX.
5. El test de un componente vive junto a él (`components/<Nombre>/__tests__/`); el test de lo que no es un componente (actions, schema, hooks) vive en `ui/__tests__/`.

## Alternativas consideradas

- **Replicar el patrón completo de `auth`** (carpetas sueltas a nivel raíz de la feature): descartada porque contradice la ubicación de borde único que ya documenta `ARCHITECTURE.md`. Sostener esa excepción exige explicarla en cada revisión en vez de apuntar a una regla escrita.
- **Mantener todo plano como `catalog`**, sin subcarpetas por componente ni archivo de estilos separado: es la opción de menor fricción para escribir, y ya funciona en la feature más avanzada del repo. Se descarta como estándar porque no defiende contra ninguno de los problemas que motivaron esta ADR — nada impide que un `className` largo o un string de usuario se cuelen inline, ya que UI-002 no lo prohíbe y DOM-009 todavía no tiene su lint construido.
- **Adoptar un patrón externo (Atomic Design o Feature-Sliced Design)**: descartada. Ambos imponen una segunda jerarquía de capas dentro de cada feature (atoms/molecules/organisms, o entities/features/widgets), duplicando una decisión de corte que `ARCH-002` ya fijó a nivel de todo el repo (rebanada vertical por dominio de negocio). Atomic Design en particular asume que el equipo construye su propio sistema de átomos visuales; acá `UI-001` ya exige partir de los componentes de DaisyUI, así que esa capa no resuelve nada que no esté resuelto.

## Consecuencias

- Toda feature nueva parte de `src/features/_template/ui/` ya organizado según esta ADR — nadie vuelve a decidir esta estructura por feature.
- `catalog` y `auth` quedan **desalineadas con esta ADR hasta que se refactoricen**; no se marcan como incumplimiento retroactivo, pero cualquier archivo nuevo que se agregue a cualquiera de las dos debe seguir esta estructura, no la vieja.
- La reorganización de `catalog`/`catalog-admin` para conformarse a esta ADR **no se aplica todavía**: `feat/us-age-08-catalog` es un PR abierto (#7) en revisión activa, ya señalado por tamaño (INT-002) y antigüedad (INT-001) — tocar sus archivos de `ui/` ahora invalidaría la revisión en curso y agrandaría un diff ya excepcional. Se aplica primero a `_template`, y sobre `catalog`/`catalog-admin` recién después de que el PR #7 se mergee a `main`.
- Esta ADR **no crea entradas nuevas en `rules.yaml`** y por lo tanto no agrega ningún chequeo a `verify.sh`. La separación lógica/render y la ausencia de magic numbers siguen sin verificación automática — dependen de revisión humana/IA hasta que, si el equipo lo decide, se registre una regla propia con su script.
- Cambia el costo de escribir un componente: más archivos por componente (hasta 5 con su test) contra los 1-2 que usaba `catalog`. Se acepta el costo porque es la única defensa real, hoy, contra estilos y texto hardcodeados mientras UI-002/DOM-009 no tengan su chequeo automático completo.
