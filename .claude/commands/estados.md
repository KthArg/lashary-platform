---
description: Confirma que vacío, carga y error existen y son consistentes (UI-003)
---
Sigue el protocolo de `.claude/skills/lashary-interfaz/SKILL.md`. Componente: $ARGUMENTS

Para cada vista de datos en el alcance: ¿existe el estado **vacío** (con acción sugerida, no un hueco blanco)? ¿el de **carga** (consistente con el patrón del catálogo, no un spinner distinto por página)? ¿el de **error** (mensaje útil + reintento donde aplica, jamás el error crudo)? ¿los tres usan los mismos componentes del patrón común?

Reporta tabla: vista | vacío | carga | error | consistente. Faltante = hallazgo UI-003 con archivo. Son exactamente lo que hace que un producto se sienta sin terminar (UI.md).
