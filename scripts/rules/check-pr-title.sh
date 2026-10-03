#!/usr/bin/env bash
# check-pr-title.sh — INT-009: título de PR en Conventional Commits, con la historia y la posición
# en la pila. Lee PR_TITLE y PR_HEAD_REF del entorno; los pone .github/workflows/pr-title.yml.
# Sin PR_TITLE no hay PR que juzgar y el check se omite: así corre dentro de verify.sh (pre-commit
# y job de reglas de ci.yml) sin romper nada. La compuerta real es pr-title.yml, que re-corre cuando
# alguien edita el título — ci.yml no escucha `edited`.
# El idioma (español) no lo puede juzgar un regex: lo verifica el revisor (L5).
#
# Probar un título antes de abrir el PR:
#   PR_TITLE="feat(catalog): algo (US-PROD-01, 2/5)" PR_HEAD_REF=feat/us-prod-01-algo \
#     bash scripts/rules/check-pr-title.sh

. "$(dirname "$0")/lib.sh"

TITLE="${PR_TITLE:-}"
HEAD_REF="${PR_HEAD_REF:-}"

if [ -z "$TITLE" ]; then
  echo "Sin título de PR (fuera de un PR) — nada que verificar."
  finish "check-pr-title"
fi

TIPOS='feat|fix|docs|refactor|test|chore|perf|build|ci|style|revert'
CABECERA_RE="^($TIPOS)\([a-z0-9][a-z0-9-]*\)!?: [^[:space:]]"
PIEZA_RE=' \((US-[A-Z]+-[0-9]+), ([0-9]+)/([0-9]+)\)$'
CIERRE_RE=' \((US-[A-Z]+-[0-9]+)\)$'

if ! [[ "$TITLE" =~ $CABECERA_RE ]]; then
  fail_rule INT-009 "'$TITLE' no empieza con <tipo>(<ámbito>): <descripción>. Tipos: ${TIPOS//|/, }; ámbito obligatorio y en minúsculas. Ejemplo: feat(catalog): formulario de paquetes (US-PROD-01, 9/10)"
  finish "check-pr-title"
fi

# Misma extracción que .github/workflows/jira-branch.yml: el ID de historia sale del nombre de la rama.
ID_RAMA=$(printf '%s' "$HEAD_REF" | grep -oiE 'us-[a-z]+-[0-9]+' | head -n 1 | tr '[:lower:]' '[:upper:]' || true)

if [ -z "$ID_RAMA" ]; then
  echo "Rama '$HEAD_REF' sin ID de historia (CI, reglas, docs de proceso): el sufijo no se exige."
  finish "check-pr-title"
fi

# Cierre: us/<ID> → main junta la pila entera, así que lleva la historia sin posición.
if printf '%s' "$HEAD_REF" | grep -qiE '^us/us-[a-z]+-[0-9]+$'; then
  if ! [[ "$TITLE" =~ $CIERRE_RE ]]; then
    fail_rule INT-009 "el PR de cierre de $ID_RAMA debe terminar en ($ID_RAMA). Ejemplo: feat(catalog): paquetes de servicios ($ID_RAMA)"
  elif [ "${BASH_REMATCH[1]}" != "$ID_RAMA" ]; then
    fail_rule INT-009 "el título cita ${BASH_REMATCH[1]} pero la rama '$HEAD_REF' es de $ID_RAMA"
  fi
  finish "check-pr-title"
fi

# Pieza: termina en (ID, i/N), con el mismo ID que la rama y 1 ≤ i ≤ N.
if ! [[ "$TITLE" =~ $PIEZA_RE ]]; then
  fail_rule INT-009 "la rama '$HEAD_REF' es una pieza de $ID_RAMA: el título debe terminar en ($ID_RAMA, i/N), con i la posición de esta pieza en una pila de N. Ejemplo: feat(catalog): formulario de paquetes ($ID_RAMA, 9/10)"
  finish "check-pr-title"
fi

ID_TITULO="${BASH_REMATCH[1]}"
# 10#: un "09" se lee en base 10, no como octal inválido.
I=$((10#${BASH_REMATCH[2]}))
N=$((10#${BASH_REMATCH[3]}))

if [ "$ID_TITULO" != "$ID_RAMA" ]; then
  fail_rule INT-009 "el título cita $ID_TITULO pero la rama '$HEAD_REF' es de $ID_RAMA"
fi
if [ "$I" -lt 1 ] || [ "$I" -gt "$N" ]; then
  fail_rule INT-009 "posición $I/$N inválida: tiene que cumplir 1 ≤ i ≤ N"
fi

finish "check-pr-title"
