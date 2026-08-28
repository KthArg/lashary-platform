#!/usr/bin/env bash
# check-spec-updated.sh — EST-003: si el diff toca código de una feature, toca también su SPEC.md.
# Requiere diff (rango en CI, staged en pre-commit).

. "$(dirname "$0")/lib.sh"

FILES=$(changed_files || true)
if [ -z "$FILES" ]; then
  echo "Diff vacío — nada que verificar."
  finish "check-spec-updated"
fi

TOUCHED_FEATURES=$(echo "$FILES" | awk -F/ '$1=="src" && $2=="features" && NF>3 {print $3}' | sort -u)
# NF>3: archivos DENTRO de la feature más allá del propio SPEC.md en la raíz cuentan;
# el SPEC.md raíz (src/features/x/SPEC.md, NF==4) también matchea — se excluye abajo.

for f in $TOUCHED_FEATURES; do
  CODE_CHANGED=$(echo "$FILES" | grep "^src/features/$f/" | grep -v "^src/features/$f/SPEC.md$" || true)
  SPEC_CHANGED=$(echo "$FILES" | grep "^src/features/$f/SPEC.md$" || true)
  if [ -n "$CODE_CHANGED" ] && [ -z "$SPEC_CHANGED" ]; then
    fail_rule EST-003 "el diff toca src/features/$f/ pero no su SPEC.md — actualizar al menos 'actualizado:' y el estado de las historias afectadas"
  fi
done

finish "check-spec-updated"
