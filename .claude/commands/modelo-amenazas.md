---
description: Modelo de amenazas de una feature - activos, actores, abusos, cobertura
---
Sigue el protocolo de `.claude/skills/lashary-seguridad/SKILL.md`. Feature: $ARGUMENTS

1. **Activos**: qué protege esta feature (datos, dinero, agenda, reputación). El expediente y el ledger pesan más (SEC-006, DOM-005).
2. **Actores**: clienta legítima, visitante anónimo, clienta hostil (automatiza, miente, abusa del flujo), cuenta admin comprometida, herramienta/dependencia comprometida (SEC-008).
3. **Superficies**: endpoints, uploads, webhooks, el API del CMS, canales de notificación.
4. **Abusos del flujo de negocio** — lo que ningún scanner ve: reservar-y-cancelar en bucle para congelar la agenda; carrera de reagendado; regularización con comprobante falso; enumeración de citas ajenas por ID; bloqueo de la dueña vía rate-limit mal diseñado (SEC-007).
5. **Cobertura**: por cada amenaza, la regla, política RLS, constraint o test que la cubre. Amenaza sin cobertura = hallazgo, con propuesta (regla nueva, test, o decisión de aceptar el riesgo — que registra el PO).

Formato: tabla amenaza | actor | superficie | cobertura | veredicto. Sin teatro: amenazas plausibles a escala de un estudio, no APTs.
