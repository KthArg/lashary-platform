#!/usr/bin/env bash
# check-status-fresh.sh — EST-002: docs/STATUS.md commiteado debe ser idéntico al regenerado.
# Mismo principio que un lockfile: el archivo es derivado; uno desactualizado es error de build.

. "$(dirname "$0")/lib.sh"

CURRENT="$REPO_ROOT/docs/STATUS.md"
REGEN="$(mktemp)"
trap 'rm -f "$REGEN"' EXIT

bash "$REPO_ROOT/scripts/status-gen.sh" "$REGEN" > /dev/null

# --strip-trailing-cr: en Windows, autocrlf reescribe el checkout con CRLF; el contenido es lo que se compara
if [ ! -f "$CURRENT" ]; then
  fail_rule EST-002 "docs/STATUS.md no existe. Generarlo: scripts/status-gen.sh"
elif ! diff --strip-trailing-cr -q "$CURRENT" "$REGEN" > /dev/null; then
  fail_rule EST-002 "docs/STATUS.md está desactualizado respecto de los specs. Regenerar: scripts/status-gen.sh. Primeras diferencias:"
  diff --strip-trailing-cr "$CURRENT" "$REGEN" | head -n 12 | sed 's/^/      /'
fi

finish "check-status-fresh"
