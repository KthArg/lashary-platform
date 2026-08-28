#!/usr/bin/env bash
# verify.sh — EL comando de verificación local. Idéntico a CI (Capa 2 = Capa 1, sin segunda
# implementación que pueda derivar). Corre todos los checks y reporta el total; no se detiene
# en el primero.
#
# Uso:
#   scripts/verify.sh --base origin/main    # modo rango (CI, o local contra main)
#   scripts/verify.sh --staged              # modo pre-commit (diff staged)
#   scripts/verify.sh                       # autodetecta: origin/main si existe, si no staged

set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

MODE="auto"
BASE=""
case "${1:-}" in
  --base) MODE="range"; BASE="${2:?falta la ref base}" ;;
  --staged) MODE="staged" ;;
  "") ;;
  *) echo "Uso: verify.sh [--base <ref> | --staged]"; exit 2 ;;
esac

if [ "$MODE" = "auto" ]; then
  if git -C "$REPO_ROOT" rev-parse --verify origin/main >/dev/null 2>&1; then
    MODE="range"; BASE="origin/main"
  else
    MODE="staged"
  fi
fi

if [ "$MODE" = "range" ]; then
  export DIFF_RANGE="$BASE...HEAD"
  echo "verify.sh — modo rango: $DIFF_RANGE"
else
  export DIFF_RANGE=""
  echo "verify.sh — modo staged"
fi
echo "Reglas: docs/spec/rules.yaml · Racional de cada check en su encabezado."
echo "════════════════════════════════════════════════════════════"

CHECKS="
check-frontmatter.sh
check-status-fresh.sh
check-spec-updated.sh
check-pr-size.sh
check-imports.sh
check-domain-purity.sh
check-migrations.sh
check-secrets.sh
check-tooling-hash.sh
check-ui-tokens.sh
"

FAILED=""
PASSED=0
for c in $CHECKS; do
  echo ""
  echo "── $c ──"
  if bash "$SCRIPT_DIR/rules/$c"; then
    PASSED=$((PASSED + 1))
  else
    FAILED="$FAILED $c"
  fi
done

echo ""
echo "════════════════════════════════════════════════════════════"
N_FAILED=$(echo "$FAILED" | wc -w | tr -d ' ')
if [ -n "$FAILED" ]; then
  echo "✖ verify: $N_FAILED check(s) fallaron:$FAILED"
  echo "  Cada fallo cita su regla, su racional y su documento. Escape legítimo: docs/spec/INTEGRATION.md#el-escape-legítimo"
  exit 1
fi
echo "✔ verify: $PASSED checks, todos en verde."
