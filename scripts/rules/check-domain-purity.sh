#!/usr/bin/env bash
# check-domain-purity.sh — DOM-004: new Date() / Date.now() prohibidos en domain/ y application/.
# El reloj se inyecta (Clock en shared/). Escanea todo el árbol, no el diff.

. "$(dirname "$0")/lib.sh"

SRC="$REPO_ROOT/src/features"
if [ ! -d "$SRC" ]; then
  echo "Sin src/features todavía — nada que verificar."
  finish "check-domain-purity"
fi

grep -rn --include='*.ts' --include='*.tsx' -E "new Date\(|Date\.now\(" "$SRC" 2>/dev/null | \
  grep -E "^[^:]*/(domain|application)/" | \
while IFS=: read -r file line content; do
  rel="${file#"$REPO_ROOT"/}"
  echo "$rel:$line — $(echo "$content" | sed 's/^[[:space:]]*//')"
done > "$REPO_ROOT/.dom-violations.tmp" || true

while IFS= read -r detail; do
  [ -n "$detail" ] && fail_rule DOM-004 "$detail"
done < "$REPO_ROOT/.dom-violations.tmp"
rm -f "$REPO_ROOT/.dom-violations.tmp"

finish "check-domain-purity"
