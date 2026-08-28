#!/usr/bin/env bash
# check-pr-size.sh — INT-002: diff ≤ 400 líneas y ≤ 2 features · INT-001: rama ≤ 3 días.
# Exentos del conteo de líneas: STATUS.md (generado), backlog (export), lockfiles.

. "$(dirname "$0")/lib.sh"

MAX_LINES=400
MAX_FEATURES=2
MAX_BRANCH_AGE_DAYS=3

if [ -z "$DIFF_RANGE" ] && [ -z "$(git -C "$REPO_ROOT" diff --cached --name-only)" ]; then
  echo "Diff vacío — nada que verificar."
  finish "check-pr-size"
fi

diff_stat() {
  if [ -n "$DIFF_RANGE" ]; then git -C "$REPO_ROOT" diff --numstat "$DIFF_RANGE"
  else git -C "$REPO_ROOT" diff --cached --numstat; fi
}

LINES=$(diff_stat | awk '
  $3 == "docs/STATUS.md" { next }
  $3 ~ /^docs\/backlog\// { next }
  $3 ~ /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/ { next }
  $1 != "-" { total += $1 + $2 }
  END { print total + 0 }')

if [ "$LINES" -gt "$MAX_LINES" ]; then
  fail_rule INT-002 "el diff tiene $LINES líneas (máximo ~$MAX_LINES). Partir la tarea; lo que funciona se mergea tras un flag (INT-004)"
fi

N_FEATURES=$(changed_files | awk -F/ '$1=="src" && $2=="features" {print $3}' | sort -u | wc -l | tr -d ' ')
if [ "$N_FEATURES" -gt "$MAX_FEATURES" ]; then
  fail_rule INT-002 "el diff toca $N_FEATURES features (máximo $MAX_FEATURES): $(changed_files | awk -F/ '$1=="src" && $2=="features" {print $3}' | sort -u | tr '\n' ' ')"
fi

# INT-001 — edad de la rama (solo en modo rango, donde hay base contra la cual medir)
if [ -n "$DIFF_RANGE" ]; then
  FIRST_COMMIT_TS=$(git -C "$REPO_ROOT" log --reverse --format=%ct "$DIFF_RANGE" 2>/dev/null | head -n 1 || true)
  if [ -n "$FIRST_COMMIT_TS" ]; then
    AGE_DAYS=$(( ( $(date +%s) - FIRST_COMMIT_TS ) / 86400 ))
    if [ "$AGE_DAYS" -gt "$MAX_BRANCH_AGE_DAYS" ]; then
      fail_rule INT-001 "el primer commit de esta rama tiene $AGE_DAYS días (máximo $MAX_BRANCH_AGE_DAYS). La tarea estaba mal dimensionada: partirla"
    fi
  fi
fi

finish "check-pr-size"
