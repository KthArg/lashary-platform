---
feature: clients
dri: pendiente
estado: en_progreso
actualizado: "2026-09-07"
historias:
  - id: US-CLI-01
    estado: no_iniciada
  - id: US-CLI-02
    estado: no_iniciada
  - id: US-CLI-03
    estado: no_iniciada
  - id: US-CLI-04
    estado: no_iniciada
  - id: US-CLI-05
    estado: en_progreso
    falta: "Todo: no existe código de la feature. PR draft abierto en rama feat/US-CLI-05-create-or-edit-clients; faltan migración (notas, unicidad de teléfono, política RLS de admin), casos de uso, UI y pruebas."
flags: []
deuda: []
defectos: []
---

# clients

Gestion de clientas: ficha, historial, anotaciones, expediente sensible (SEC-006).

## Qué hace hoy

Hoy: no existe código. Se detiene antes de todo.

US-CLI-05 está tomada y en curso; el resto de historias siguen `no_iniciada`.

## Qué no hace todavía

Todo. La tabla `public.clients_profiles` existe desde la migración
`20260901000000_auth_roles_and_clients.sql`, pero hoy solo la escribe `auth` durante
el registro de una clienta: no hay alta ni edición manual por parte de la administradora.

## Contrato público

`index.ts` — no existe todavía. Al crearse, todo import desde otra feature entra solo por ahí (ARCH-003).

## Decisiones

- Pendiente de PO: qué significa "unificar" dos clientas con el mismo teléfono
  (criterio 3 de US-CLI-05). Sin esa definición el criterio no es objetivamente verificable.
