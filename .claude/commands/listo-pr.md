---
description: La compuerta pre-PR - pass o la lista exacta de lo que bloquea
---
Sigue el protocolo de `.claude/skills/lashary-desarrollo/SKILL.md`.

Verifica, citando regla por ID en cada punto:
1. `/verificar` corrido en esta sesión con salida mostrada — si no, este comando falla aquí mismo.
2. Front-matter del SPEC.md actualizado (EST-003); STATUS.md regenerado e idéntico (EST-002).
3. Diff ≤ ~400 líneas y ≤ 2 features (INT-002); rama ≤ 3 días (INT-001); máx. 1 migración forward-only (INT-008).
4. Sin imports ilegales (ARCH-003/004); criterios mapeados a pruebas; deuda/flags registrados con dueño y fecha (INT-004, EST-006).
5. Si el diff toca auth, RLS, uploads, migraciones, dinero o expediente: checklist de `lashary-seguridad` corrido.

Veredicto: **PASS** (y el texto sugerido para el PR según `.github/PULL_REQUEST_TEMPLATE.md`) o la lista exacta de bloqueos. Nunca "casi listo".
