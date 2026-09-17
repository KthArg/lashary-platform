#!/usr/bin/env bash
# sync-jira.sh — Refleja en Jira el estado de cada historia (HIST) de los SPEC.md.
# Busca el issue por su ID (US-XXX-NN) en el summary y lo transiciona al estado mapeado.
#
# Local:   export JIRA_BASE_URL JIRA_USER_EMAIL JIRA_API_TOKEN; bash scripts/sync-jira.sh
#   --issue US-XXX-NN --to "In Progress"   una sola historia a esa columna (jira-branch.yml);
#                                          sin argumentos recorre todos los SPEC.md (jira-sync.yml).
#   JIRA_DRY_RUN=1      busca y compara, no transiciona nada.
#   JIRA_PROJECT_KEY    opcional; acota el JQL a ese proyecto.
# Salida: 0 ok · 1 configuración/credenciales · 2 una o más historias fallaron.
# Nunca imprime el token ni el email (SEC-004); la URL base sí, no es secreto.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/rules/lib.sh"

ONE_ID=""; ONE_TO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --issue) ONE_ID="${2:?--issue requiere un ID}"; shift 2 ;;
    --to)    ONE_TO="${2:?--to requiere una columna de Jira}"; shift 2 ;;
    *) echo "✖ Argumento desconocido: $1 (uso: [--issue US-XXX-NN --to \"<columna>\"])"; exit 1 ;;
  esac
done
if [ -n "$ONE_ID$ONE_TO" ] && { [ -z "$ONE_ID" ] || [ -z "$ONE_TO" ]; }; then
  echo "✖ --issue y --to van juntos."; exit 1
fi
case "$ONE_TO" in
  ""|"To Do"|"In Progress"|"Waiting QA"|"Done") ;;
  *) echo "✖ Columna desconocida: '$ONE_TO' (válidas: To Do, In Progress, Waiting QA, Done)."; exit 1 ;;
esac

for v in JIRA_BASE_URL JIRA_USER_EMAIL JIRA_API_TOKEN; do
  if [ -z "${!v:-}" ]; then
    echo "✖ Falta $v (secreto/variable de entorno requerida)."; exit 1
  fi
done

# Un '\n' o espacio al final del secreto rompe curl con exit 3 (URL malformed): se sanean.
JIRA_BASE_URL="$(printf '%s' "$JIRA_BASE_URL" | tr -d '[:space:]')"
JIRA_USER_EMAIL="$(printf '%s' "$JIRA_USER_EMAIL" | tr -d '[:space:]')"
JIRA_API_TOKEN="$(printf '%s' "$JIRA_API_TOKEN" | tr -d '[:space:]')"
JIRA_BASE_URL="${JIRA_BASE_URL%/}"
case "$JIRA_BASE_URL" in
  https://*) ;;
  *) echo "✖ JIRA_BASE_URL debe empezar con https:// (recibido: '$JIRA_BASE_URL')."; exit 1 ;;
esac
DRY_RUN="${JIRA_DRY_RUN:-0}"

CURL=(curl -sS --globoff --fail-with-body --max-time 30 --retry 2 --retry-delay 2
      -u "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" -H "Accept: application/json")
# stderr de curl va a $ERR para que nunca se mezcle con el JSON de stdout.
ERR="$(mktemp)"; trap 'rm -f "$ERR"' EXIT
jira_get()  { "${CURL[@]}" "$@" 2>"$ERR"; }
jira_post() { "${CURL[@]}" -X POST -H "Content-Type: application/json" "$@" 2>"$ERR"; }
err_detail() { printf '%s %s' "$(tail -n 1 "$ERR")" "$1" | head -c 300; }

# Preflight: valida URL y credenciales antes de tocar ninguna historia.
if ! me=$(jira_get "$JIRA_BASE_URL/rest/api/3/myself"); then
  echo "✖ No se pudo autenticar en $JIRA_BASE_URL — revisa JIRA_BASE_URL, JIRA_USER_EMAIL y JIRA_API_TOKEN."
  echo "  Detalle: $(err_detail "$me")"
  exit 1
fi
echo "✔ Autenticado como $(printf '%s' "$me" | jq -r '.displayName // "?"')"
[ "$DRY_RUN" = "1" ] && echo "  (modo simulación: no se transiciona nada)"

# Estados del SPEC → columnas de Jira. Sin mapeo (p. ej. bloqueada) → se omite, nunca se regresa a To Do.
map_status() {
  case "$1" in
    no_iniciada) echo "To Do" ;;
    en_progreso) echo "In Progress" ;;
    en_revision) echo "Waiting QA" ;;
    terminada)   echo "Done" ;;
    *)           echo "" ;;
  esac
}

# Orden del tablero. El sync solo avanza: si Jira ya va más adelante que el SPEC de main (trabajo en
# ramas sin mergear), no se retrocede la tarjeta. Columnas fuera del orden → 0 (se tratan como inicio).
status_rank() {
  case "$1" in
    "To Do")       echo 1 ;;
    "In Progress") echo 2 ;;
    "Waiting QA")  echo 3 ;;
    "Done")        echo 4 ;;
    *)             echo 0 ;;
  esac
}

# sync_issue <id-historia> <estado-jira> — 0 ok/omitido, 1 fallo.
# Cada curl va en `if ! res=$(...)`: la función se invoca con `|| ...`, lo que desactiva errexit dentro.
sync_issue() {
  local id="$1" target="$2" jql res key current trans_id
  echo "Sincronizando $id hacia '$target'..."

  jql="summary ~ \"\\\"$id\\\"\""   # frase exacta; el filtro fino se hace en jq
  [ -n "${JIRA_PROJECT_KEY:-}" ] && jql="project = $JIRA_PROJECT_KEY AND $jql"
  if ! res=$(jira_get -G --data-urlencode "jql=$jql" --data-urlencode "fields=summary,status" \
               --data-urlencode "maxResults=10" "$JIRA_BASE_URL/rest/api/3/search/jql"); then
    echo "  ✖ Falló la búsqueda: $(err_detail "$res")"; return 1
  fi
  # ID como palabra completa: US-AUTH-01 no debe matchear US-AUTH-010.
  key=$(printf '%s' "$res" | jq -r --arg id "$id" \
    '[.issues[]? | select(.fields.summary | test("(^|[^A-Za-z0-9])" + $id + "($|[^0-9])"))][0].key // empty')
  if [ -z "$key" ]; then
    echo "  → No hay issue en Jira con '$id' en el summary; se omite."; return 0
  fi
  current=$(printf '%s' "$res" | jq -r --arg k "$key" '.issues[] | select(.key == $k) | .fields.status.name')
  if [ "$current" = "$target" ]; then
    echo "  → $key ya está en '$target'."; return 0
  fi
  if [ "$(status_rank "$current")" -gt "$(status_rank "$target")" ]; then
    echo "  → $key va adelante en Jira ('$current' > '$target'); no se retrocede."; return 0
  fi

  if ! res=$(jira_get "$JIRA_BASE_URL/rest/api/3/issue/$key/transitions"); then
    echo "  ✖ $key: no se pudieron leer las transiciones: $(err_detail "$res")"; return 1
  fi
  trans_id=$(printf '%s' "$res" | jq -r --arg t "$target" '[.transitions[] | select(.to.name == $t) | .id][0] // empty')
  if [ -z "$trans_id" ]; then
    echo "  ✖ $key: sin transición de '$current' a '$target'. Disponibles: $(printf '%s' "$res" | jq -r '[.transitions[].to.name] | join(", ")')"
    return 1
  fi
  if [ "$DRY_RUN" = "1" ]; then
    echo "  [simulación] $key: '$current' → '$target' (transición $trans_id)"; return 0
  fi
  if ! res=$(jira_post -o /dev/null -d "{\"transition\":{\"id\":\"$trans_id\"}}" \
               "$JIRA_BASE_URL/rest/api/3/issue/$key/transitions"); then
    echo "  ✖ $key: falló la transición a '$target': $(err_detail "$res")"; return 1
  fi
  echo "  ✔ $key: '$current' → '$target'."
}

# Modo puntual: una historia a una columna concreta (la rama la marca, no el SPEC).
if [ -n "$ONE_ID" ]; then
  if sync_issue "$ONE_ID" "$ONE_TO"; then exit 0; else exit 2; fi
fi

TOTAL=0; FALLOS=0
# Sin subshell (ni pipe a while): los contadores deben sobrevivir al bucle.
for s in "$REPO_ROOT"/src/features/*/SPEC.md; do
  case "$s" in */_template/*) continue ;; esac
  while IFS= read -r r; do
    hist_id=$(field_of "$r" id); hist_est=$(field_of "$r" estado)
    [ -n "$hist_id" ] && [ -n "$hist_est" ] || continue
    target=$(map_status "$hist_est")
    if [ -z "$target" ]; then
      echo "→ $hist_id está '$hist_est' en el SPEC: sin columna equivalente en Jira, se omite."; continue
    fi
    TOTAL=$((TOTAL + 1))
    sync_issue "$hist_id" "$target" || FALLOS=$((FALLOS + 1))
  done < <(spec_records "$s" | grep '^HIST|' || true)
done

echo ""
if [ "$FALLOS" -gt 0 ]; then
  echo "✖ Sincronización: $FALLOS de $TOTAL historias fallaron."; exit 2
fi
echo "✔ Sincronización completada: $TOTAL historias revisadas."
