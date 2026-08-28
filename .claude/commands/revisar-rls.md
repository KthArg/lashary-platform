---
description: Revisa políticas RLS y confirma el test de aislamiento cross-cliente
---
Sigue el protocolo de `.claude/skills/lashary-seguridad/SKILL.md`. Objetivo: $ARGUMENTS (tabla o feature)

1. Lista las políticas RLS de las tablas en alcance (migraciones en `supabase/migrations/`): por operación (select/insert/update/delete), ¿quién pasa y por qué?
2. **Confirma que existe el test de aislamiento** (SEC-002): con token válido de otra clienta, intenta leer Y escribir, y verifica que cada intento falla. Sin ese test = hallazgo **bloqueante**, la tabla no se mergea.
3. Busca los clásicos: política sin `with check` en insert/update; tabla con RLS deshabilitado; policy que confía en un claim editable por el cliente; acceso del service role asumido en código de app (SEC-003).
4. Expediente (`clients_*` sensibles): además, acceso solo admin + bitácora + storage privado (SEC-006).

Reporta con regla ID y ubicación. No modifiques políticas: propone el DDL y el test, la decisión es humana.
