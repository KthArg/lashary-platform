#!/usr/bin/env bash
# check-secrets.sh — SEC-003: service-role key de Supabase en cualquier parte del diff ·
# SEC-004: secretos (llaves privadas, tokens, API keys con valor) en el diff.
# Solo mira líneas AGREGADAS: no re-acusa historia vieja en cada PR.

. "$(dirname "$0")/lib.sh"

LINES=$(added_lines || true)
if [ -z "$LINES" ]; then
  echo "Diff vacío — nada que verificar."
  finish "check-secrets"
fi

# Exclusiones: este propio script y su gemelo de test contienen los patrones que busca.
LINES=$(echo "$LINES" | grep -v "^scripts/rules/check-secrets.sh:" || true)

# Cada hit viene como "archivo:contenido" (added_lines); se reporta el archivo, nunca el valor.
# SEC-003 — service role: nombre de variable con valor asignado, o JWT con claim service_role
echo "$LINES" | grep -E "(SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY)[\"']?[[:space:]]*[:=][[:space:]]*[\"']?[A-Za-z0-9_.\-]{8,}" | \
while IFS= read -r hit; do
  echo "SEC-003|valor asignado a una variable de service role en: ${hit%%:*}"
done > "$REPO_ROOT/.sec-violations.tmp" || true

echo "$LINES" | grep -E "eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}" | \
while IFS= read -r hit; do
  echo "SEC-004|token JWT literal en el diff (${hit%%:*}) — los tokens van en variables de entorno, no en el repo"
done >> "$REPO_ROOT/.sec-violations.tmp" || true

# SEC-004 — llaves privadas y credenciales con valor
echo "$LINES" | grep -E -- "-----BEGIN [A-Z ]*PRIVATE KEY-----" | \
while IFS= read -r hit; do
  echo "SEC-004|llave privada en el diff: ${hit%%:*}"
done >> "$REPO_ROOT/.sec-violations.tmp" || true

echo "$LINES" | grep -iE "(api[_-]?key|secret|password|token)[\"']?[[:space:]]*[:=][[:space:]]*[\"'][A-Za-z0-9_\-]{16,}[\"']" | \
  grep -viE "(example|placeholder|<|\\\$\{|process\.env|import\.meta)" | \
while IFS= read -r hit; do
  echo "SEC-004|credencial con valor literal en el diff: ${hit%%:*}"
done >> "$REPO_ROOT/.sec-violations.tmp" || true

echo "$LINES" | grep -E "(sk_live_[A-Za-z0-9]{8,}|AKIA[0-9A-Z]{16}|xox[bpoas]-[A-Za-z0-9-]{10,})" | \
while IFS= read -r hit; do
  echo "SEC-004|patrón de credencial conocido en el diff: ${hit%%:*}"
done >> "$REPO_ROOT/.sec-violations.tmp" || true

sort -u "$REPO_ROOT/.sec-violations.tmp" 2>/dev/null | while IFS='|' read -r rid detail; do
  [ -n "$rid" ] && echo "$rid|$detail"
done > "$REPO_ROOT/.sec-final.tmp" || true

while IFS='|' read -r rid detail; do
  [ -n "$rid" ] && fail_rule "$rid" "$detail"
done < "$REPO_ROOT/.sec-final.tmp"
rm -f "$REPO_ROOT/.sec-violations.tmp" "$REPO_ROOT/.sec-final.tmp"

finish "check-secrets"
