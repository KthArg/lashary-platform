---
description: Checklist de seguridad contra el diff actual o una ruta
---
Sigue el protocolo de `.claude/skills/lashary-seguridad/SKILL.md`. Alcance: $ARGUMENTS (vacío = diff actual)

Corre el checklist completo de la skill (SEC-001..007, DOM-008) sobre el alcance. Reporta por severidad (bloqueante/alta/media), cada hallazgo con: regla ID, ubicación archivo:línea, qué se rompe, y el arreglo concreto. Hallazgo sin regla = `[opinión]`. Lo determinista que CI ya cubre (SEC-003/004) no se re-verifica a mano: se cita la regla. No apruebas nada: reportas.
