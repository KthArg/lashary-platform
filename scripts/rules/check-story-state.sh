#!/usr/bin/env bash
# check-story-state.sh — EST-007: el PR de una historia hacia main trae el estado final de esa
# historia. Si `us/<ID>` → main se fusiona con <ID> en otro estado que `terminada`, el spec queda
# atrasado respecto del código y bloquea en falso a las historias que dependen de ella (pasó con
# US-AGE-13: entró a main el 2026-10-13 y su spec siguió en en_progreso).
#
# Solo juzga el PR de cierre: rama `us/<ID>` y base `main`. Lee del entorno:
#   PR_HEAD_REF  rama del PR (sin ella no hay PR que juzgar y el check se omite)
#   PR_BASE_REF  rama base (vacía = se asume main)
#   PR_DRAFT     "true" mientras el PR es draft: la historia está en curso y no se juzga
#   PR_LABELS    etiquetas separadas por coma; `excepcion-proceso` permite cerrar en_progreso
#                (un criterio diferido, DEPENDENCIES.md). Sin la variable no se conocen las
#                etiquetas: se avisa en vez de fallar, y decide el workflow pr-story-state.yml.
#
# Probar a mano:
#   PR_HEAD_REF=us/US-BLOG-03 PR_BASE_REF=main PR_LABELS= bash scripts/rules/check-story-state.sh

. "$(dirname "$0")/lib.sh"

HEAD_REF="${PR_HEAD_REF:-}"
BASE_REF="${PR_BASE_REF:-main}"

if ! printf '%s' "$HEAD_REF" | grep -qiE '^us/us-[a-z]+-[0-9]+$' || [ "$BASE_REF" != "main" ]; then
  echo "No es el PR de cierre de una historia (us/<ID> → main): nada que verificar."
  finish "check-story-state"
fi

ID=$(printf '%s' "$HEAD_REF" | sed 's#^[^/]*/##' | tr '[:lower:]' '[:upper:]')

if [ "${PR_DRAFT:-false}" = "true" ]; then
  echo "PR de $ID en draft: la historia está en curso. Se verifica al marcarlo listo para revisión."
  finish "check-story-state"
fi

# El SPEC.md que declara la historia en su front-matter.
OWNER=""
RECORD=""
for spec in "$REPO_ROOT"/src/features/*/SPEC.md; do
  [ -f "$spec" ] || continue
  rec=$(spec_records "$spec" | grep "^HIST|id=$ID|" || true)
  if [ -n "$rec" ]; then
    OWNER="${spec#"$REPO_ROOT"/}"
    RECORD="$rec"
    break
  fi
done

if [ -z "$RECORD" ]; then
  fail_rule EST-007 "ningún src/features/*/SPEC.md declara $ID en su front-matter: el PR de cierre tiene que dejarla registrada"
  finish "check-story-state"
fi

ESTADO=$(field_of "$RECORD" estado)

if [ "$ESTADO" = "terminada" ]; then
  echo "$ID queda terminada en $OWNER."
  finish "check-story-state"
fi

if [ -z "${PR_LABELS+x}" ]; then
  echo "  ⚠ EST-007 — $ID queda '$ESTADO' en $OWNER al cerrar su PR."
  echo "    Aquí no se conocen las etiquetas del PR; lo decide el check 'estado de la historia (EST-007)'."
  finish "check-story-state"
fi

if [ "$ESTADO" = "en_progreso" ] && printf ',%s,' "$PR_LABELS" | grep -q ',excepcion-proceso,'; then
  echo "$ID cierra en_progreso con la etiqueta excepcion-proceso (criterio diferido): $(field_of "$RECORD" falta)"
  finish "check-story-state"
fi

fail_rule EST-007 "el PR de cierre deja $ID en '$ESTADO' en $OWNER. Pásala a terminada con su evidencia en este mismo PR; si entra con un criterio diferido, déjala en_progreso con su falta y pon la etiqueta excepcion-proceso con la justificación en la descripción"
finish "check-story-state"
