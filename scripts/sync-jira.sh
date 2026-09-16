#!/usr/bin/env bash
# sync-jira.sh — Sincroniza el estado de las historias en SPEC.md con Jira.
# Depende de secretos inyectados por GitHub Actions.

set -eu
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/rules/lib.sh"

if [ -z "${JIRA_BASE_URL:-}" ] || [ -z "${JIRA_USER_EMAIL:-}" ] || [ -z "${JIRA_API_TOKEN:-}" ]; then
  echo "Error: Faltan credenciales de Jira (JIRA_BASE_URL, JIRA_USER_EMAIL, JIRA_API_TOKEN)."
  exit 1
fi

# Eliminar slash final de la URL si existe
JIRA_BASE_URL="${JIRA_BASE_URL%/}"

map_status() {
  case "$1" in
    "no_iniciada") echo "To Do" ;;
    "en_progreso") echo "In Progress" ;;
    "en_revision") echo "Waiting QA" ;;
    "terminada")   echo "Done" ;;
    "bloqueada")   echo "To Do" ;; # Fallback provisional
    *)             echo "To Do" ;;
  esac
}

sync_issue() {
  local hist_id="$1"
  local target_status="$2"

  echo "Sincronizando $hist_id hacia '$target_status'..."

  # Buscar el issue key en Jira usando JQL (summary ~ "US-XXX-YY")
  local jql_encoded="summary%20~%20%22${hist_id}%22"
  local search_res
  search_res=$(curl -s -u "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" \
    -X GET -H "Content-Type: application/json" \
    "${JIRA_BASE_URL}/rest/api/3/search?jql=${jql_encoded}&maxResults=1&fields=status")
  
  local issue_key
  issue_key=$(echo "$search_res" | jq -r '.issues[0].key // empty')
  
  if [ -z "$issue_key" ]; then
    echo "  → No se encontró el issue en Jira."
    return
  fi
  
  local current_status
  current_status=$(echo "$search_res" | jq -r '.issues[0].fields.status.name // empty')
  
  if [ "$current_status" = "$target_status" ]; then
    echo "  → $issue_key ya está en '$target_status'."
    return
  fi

  # Obtener transiciones disponibles para este issue
  local trans_res
  trans_res=$(curl -s -u "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" \
    -X GET -H "Content-Type: application/json" \
    "${JIRA_BASE_URL}/rest/api/3/issue/${issue_key}/transitions")

  local trans_id
  trans_id=$(echo "$trans_res" | jq -r ".transitions[] | select(.to.name == \"$target_status\") | .id" | head -n 1)

  if [ -z "$trans_id" ]; then
    echo "  → Advertencia: No se encontró una transición válida hacia '$target_status'. Estado actual: '$current_status'."
    return
  fi

  echo "  → Transicionando $issue_key de '$current_status' a '$target_status' (Transition ID: $trans_id)..."
  local update_res
  update_res=$(curl -s -o /dev/null -w "%{http_code}" -u "${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}" \
    -X POST -H "Content-Type: application/json" \
    -d "{\"transition\": {\"id\": \"$trans_id\"}}" \
    "${JIRA_BASE_URL}/rest/api/3/issue/${issue_key}/transitions")

  if [ "$update_res" = "204" ]; then
    echo "  → Éxito."
  else
    echo "  → Falló la transición. Código HTTP: $update_res"
  fi
}

echo "=== Sincronizando repositorio con Jira ==="

SPECS=$(ls "$REPO_ROOT"/src/features/*/SPEC.md 2>/dev/null | grep -v '/_template/' || true)
if [ -z "$SPECS" ]; then
  echo "No se encontraron SPEC.md."
  exit 0
fi

for s in $SPECS; do
  spec_records "$s" | grep '^HIST|' | while IFS= read -r r; do
    hist_id=$(field_of "$r" id)
    hist_est=$(field_of "$r" estado)
    
    if [ -n "$hist_id" ] && [ -n "$hist_est" ]; then
      target=$(map_status "$hist_est")
      sync_issue "$hist_id" "$target"
    fi
  done
done

echo "Sincronización completada."
