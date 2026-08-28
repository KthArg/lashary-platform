#!/usr/bin/env bash
# check-ui-tokens.sh — UI-002: valores arbitrarios de Tailwind (colores hex, px sueltos)
# prohibidos fuera del archivo de tokens. Graduación de Capa 4 → Capa 1 (§11.7).

. "$(dirname "$0")/lib.sh"

SRC="$REPO_ROOT/src"
if [ ! -d "$SRC" ]; then
  echo "Sin src todavía — nada que verificar."
  finish "check-ui-tokens"
fi

# clases arbitrarias: bg-[#fff], mt-[13px], text-[15px], w-[42rem], [background:#...]
grep -rn --include='*.tsx' --include='*.jsx' -E "\[(#[0-9a-fA-F]{3,8}|[0-9]+(px|rem|em|vh|vw|%))\]" "$SRC" 2>/dev/null | \
  grep -v "tailwind.config" | \
while IFS=: read -r file line content; do
  rel="${file#"$REPO_ROOT"/}"
  echo "$rel:$line — valor arbitrario: $(echo "$content" | grep -oE "\[[^]]*\]" | head -n 1)"
done > "$REPO_ROOT/.ui-violations.tmp" || true

while IFS= read -r detail; do
  [ -n "$detail" ] && fail_rule UI-002 "$detail"
done < "$REPO_ROOT/.ui-violations.tmp"
rm -f "$REPO_ROOT/.ui-violations.tmp"

finish "check-ui-tokens"
