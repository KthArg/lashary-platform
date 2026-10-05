#!/usr/bin/env bash
# Pruebas del check real con ramas temporales y commits de diez días.
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TEST_ROOT="$(mktemp -d -t lashary-excepcion.XXXXXXXX)"
PASSED=0

fixture() {
  local dir="$TEST_ROOT/$1"
  mkdir -p "$dir/docs/spec" "$dir/docs/process"
  cp "$ROOT/docs/spec/rules.yaml" "$dir/docs/spec/rules.yaml"
  cd "$dir"
  git init -q -b main
  git config core.autocrlf false
  git config user.name 'Prueba local'
  git config user.email 'prueba@example.invalid'
  git add .
  git commit -qm 'docs: preparar base'
  git update-ref refs/remotes/origin/us/US-AGE-13 HEAD
  git switch -qc pieza
  printf 'pieza\n' > cambio.txt
  git add .
  local old
  old="$(date -u -d '10 days ago' +%Y-%m-%dT%H:%M:%SZ)"
  GIT_AUTHOR_DATE="$old" GIT_COMMITTER_DATE="$old" git commit -qm 'feat: pieza antigua'
  git switch -q main
  printf '%s\n' 'regla,pr,rama,base,base_integracion,vence_utc' \
    'INT-001,115,us/US-AGE-13-2-audit-domain,us/US-AGE-13-1-audit-schema,us/US-AGE-13,2099-01-01T00:00:00Z' \
    > docs/process/excepciones-proceso.csv
  git add .
  git commit -qm 'docs: registrar excepción'
  git update-ref refs/remotes/origin/main HEAD
  git switch -q pieza
  export DIFF_RANGE='origin/us/US-AGE-13...HEAD'
  export PR_HEAD_REF='us/US-AGE-13-2-audit-domain' PR_BASE_REF='us/US-AGE-13-1-audit-schema'
  export PR_NUMBER=115 PR_PROCESS_EXCEPTION=1
  unset PUSH_TO_MAIN
}

check() {
  local expected="$1" message="$2" actual=0 output
  output="$(bash "$ROOT/scripts/rules/check-pr-size.sh" 2>&1)" || actual=$?
  if [ "$actual" -ne "$expected" ] || ! printf '%s' "$output" | grep -q "$message"; then
    printf 'FALLO: %s\n%s\n' "$CASE" "$output"
    exit 1
  fi
  PASSED=$((PASSED + 1))
  printf 'OK: %s\n' "$CASE"
}

CASE='excepción vigente y registrada en main'; fixture vigente; check 0 'Excepción INT-001'
CASE='sin etiqueta'; fixture etiqueta; PR_PROCESS_EXCEPTION=0; check 1 'primer commit'
CASE='otro PR'; fixture numero; PR_NUMBER=114; check 1 'primer commit'
CASE='otra rama'; fixture rama; PR_HEAD_REF='us/US-AGE-13-1-audit-schema'; check 1 'primer commit'
CASE='otra base'; fixture base; PR_BASE_REF='us/otra-historia'; check 1 'primer commit'
CASE='base raíz tras integrar la pieza anterior'; fixture integrada; PR_BASE_REF='us/US-AGE-13'; check 0 'Excepción INT-001'
CASE='número inválido'; fixture invalida; PR_NUMBER='sin-numero'; check 1 'primer commit'
CASE='registro duplicado'; fixture duplicada
git switch -q main
tail -n 1 docs/process/excepciones-proceso.csv >> docs/process/excepciones-proceso.csv
git add .; git commit -qm 'docs: duplicar registro'; git update-ref refs/remotes/origin/main HEAD
git switch -q pieza
check 1 'primer commit'
CASE='registro aún no integrado'; fixture pendiente
git update-ref refs/remotes/origin/main refs/remotes/origin/us/US-AGE-13
mkdir -p docs/process
git show main:docs/process/excepciones-proceso.csv > docs/process/excepciones-proceso.csv
git add .; git commit -qm 'docs: proponer excepción en la pieza'
check 1 'primer commit'
CASE='excepción vencida'; fixture vencida
git switch -q main
sed -i 's/2099-01-01T00:00:00Z/2000-01-01T00:00:00Z/' docs/process/excepciones-proceso.csv
git add .; git commit -qm 'docs: vencer excepción'; git update-ref refs/remotes/origin/main HEAD
git switch -q pieza
check 1 'primer commit'
CASE='fecha inválida'; fixture fecha
git switch -q main
sed -i 's/2099-01-01T00:00:00Z/fecha-invalida/' docs/process/excepciones-proceso.csv
git add .; git commit -qm 'docs: fecha inválida'; git update-ref refs/remotes/origin/main HEAD
git switch -q pieza
check 1 'primer commit'
CASE='400 líneas siguen obligatorias'; fixture tamano
seq 1 401 > cambio.txt
git add .; git commit -qm 'feat: pieza demasiado grande'
check 1 'INT-002'
printf '%s pruebas aprobadas.\n' "$PASSED"
