#!/usr/bin/env bash
# check-imports.sh — ARCH-003: import entre features solo por entry point ·
# ARCH-004: domain/ no importa de ninguna otra feature.
# Escanea todo src/features/ (no depende del diff). Complementa al ESLint (Capa 3):
# misma regla, segunda red — este corre aunque alguien apague el linter.

. "$(dirname "$0")/lib.sh"

SRC="$REPO_ROOT/src/features"
if [ ! -d "$SRC" ]; then
  echo "Sin src/features todavía — nada que verificar."
  finish "check-imports"
fi

# Todos los archivos de código con imports que mencionan features/
grep -rn --include='*.ts' --include='*.tsx' -E "(from|import)[[:space:]].*['\"][^'\"]*features/" "$SRC" 2>/dev/null | \
while IFS=: read -r file line content; do
  rel="${file#"$REPO_ROOT"/}"
  current=$(echo "$rel" | awk -F/ '{print $3}')
  # feature importada y subruta después de su nombre
  target=$(echo "$content" | sed -n "s/.*features\/\([a-z-]*\).*/\1/p")
  [ -z "$target" ] && continue
  [ "$target" = "$current" ] && continue
  subpath=$(echo "$content" | sed -n "s/.*features\/$target\/\([^'\"]*\).*/\1/p")

  if echo "$rel" | grep -q "^src/features/$current/domain/"; then
    echo "ARCH-004|$rel:$line importa de la feature '$target' desde domain/ — domain no importa de ninguna otra feature"
  elif [ -n "$subpath" ] && [ "$subpath" != "index" ] && [ "$subpath" != "index.ts" ]; then
    echo "ARCH-003|$rel:$line importa 'features/$target/$subpath' — solo se importa el entry point (features/$target)"
  fi
done > "$REPO_ROOT/.imp-violations.tmp" || true

while IFS='|' read -r rid detail; do
  [ -n "$rid" ] && fail_rule "$rid" "$detail"
done < "$REPO_ROOT/.imp-violations.tmp"
rm -f "$REPO_ROOT/.imp-violations.tmp"

finish "check-imports"
