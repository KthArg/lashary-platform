#!/usr/bin/env bash
# lib.sh — helpers compartidos por todos los checks (Capa 1 y Capa 2).
# Lee docs/spec/rules.yaml para citar en cada fallo: regla, racional y ancla (§ ver INTEGRATION.md).
# Mismo código corre en CI y localmente: no hay segunda implementación que pueda derivar.

set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
# Git Bash en Windows devuelve C:/... — el ':' del drive rompe los parseos por ':'.
# cd+pwd normaliza a forma POSIX (/c/...); en Linux es un no-op.
REPO_ROOT="$(cd "$REPO_ROOT" && pwd)"
RULES_FILE="$REPO_ROOT/docs/spec/rules.yaml"

# rule_field <ID> <campo> — extrae un campo de una regla de rules.yaml
rule_field() {
  awk -v id="$1" -v field="$2" '
    $0 ~ "^  - id: " id "$" { in_rule = 1; next }
    in_rule && /^  - id: / { exit }
    in_rule && index($0, "    " field ": ") == 1 {
      line = $0
      sub("^    " field ": ", "", line)
      gsub(/^"|"$/, "", line)
      print line
      exit
    }' "$RULES_FILE"
}

VIOLATIONS=0

# fail_rule <ID> <detalle...> — reporta una violación citando la regla completa
fail_rule() {
  local id="$1"; shift
  echo ""
  echo "  ✖ $id — $(rule_field "$id" title)"
  echo "    Regla:   $(rule_field "$id" statement)"
  echo "    Por qué: $(rule_field "$id" rationale)"
  echo "    Detalle: $*"
  echo "    Ver:     $(rule_field "$id" doc)$(rule_field "$id" anchor)"
  VIOLATIONS=$((VIOLATIONS + 1))
}

# finish <nombre-check> — cierra el check con resumen y exit code
finish() {
  echo ""
  if [ "$VIOLATIONS" -gt 0 ]; then
    echo "✖ $1: $VIOLATIONS violación(es)"
    exit 1
  fi
  echo "✔ $1: sin violaciones"
  exit 0
}

# ── Diff: dos modos ───────────────────────────────────────────────
# DIFF_RANGE="origin/main...HEAD"  → modo rango (CI)
# DIFF_RANGE=""                    → modo staged (pre-commit local)
DIFF_RANGE="${DIFF_RANGE:-}"

changed_files() {
  if [ -n "$DIFF_RANGE" ]; then git -C "$REPO_ROOT" diff --name-only --diff-filter=ACMR "$DIFF_RANGE"
  else git -C "$REPO_ROOT" diff --cached --name-only --diff-filter=ACMR; fi
}

all_touched_files() { # incluye borrados/renombrados (para migraciones)
  if [ -n "$DIFF_RANGE" ]; then git -C "$REPO_ROOT" diff --name-status "$DIFF_RANGE"
  else git -C "$REPO_ROOT" diff --cached --name-status; fi
}

added_lines() { # líneas agregadas del diff, prefijadas "archivo:contenido"
  if [ -n "$DIFF_RANGE" ]; then git -C "$REPO_ROOT" diff "$DIFF_RANGE"
  else git -C "$REPO_ROOT" diff --cached; fi | awk '
    /^\+\+\+ b\// { file = substr($0, 7); next }
    /^\+/ && !/^\+\+\+/ { print file ":" substr($0, 2) }'
}

# ── Parser de front-matter de SPEC.md ─────────────────────────────
# Emite líneas normalizadas:
#   META|clave|valor          (feature, dri, estado, actualizado)
#   HIST|id=..|estado=..|...  FLAG|nombre=..|...  DEUD|que=..|...  DEFE|que=..|...
spec_records() {
  awk '
    /^---[[:space:]]*$/ { fm++; next }
    fm != 1 { if (fm >= 2) exit; next }
    { line = $0 }
    /^[a-z_]+:/ {
      if (rec != "") { print rec; rec = "" }
      section = ""
      if (line ~ /^historias:/) { section = "historias"; next }
      if (line ~ /^flags:/)     { section = "flags"; next }
      if (line ~ /^deuda:/)     { section = "deuda"; next }
      if (line ~ /^defectos:/)  { section = "defectos"; next }
      key = line; sub(/:.*$/, "", key)
      val = line; sub(/^[a-z_]+:[[:space:]]*/, "", val); gsub(/^"|"$/, "", val)
      print "META|" key "|" val
      next
    }
    /^  - / && section != "" {
      if (rec != "") print rec
      tag = toupper(substr(section, 1, 4))
      item = line; sub(/^  - /, "", item)
      k = item; sub(/:.*$/, "", k)
      v = substr(item, length(k) + 2); sub(/^[[:space:]]*/, "", v); gsub(/^"|"$/, "", v)
      rec = tag "|" k "=" v
      next
    }
    /^    [a-z_]+:/ && rec != "" {
      item = line; sub(/^    /, "", item)
      k = item; sub(/:.*$/, "", k)
      v = substr(item, length(k) + 2); sub(/^[[:space:]]*/, "", v); gsub(/^"|"$/, "", v)
      rec = rec "|" k "=" v
      next
    }
    END { if (rec != "") print rec }
  ' "$1"
}

# field_of "<registro>" <clave> — extrae clave=valor de un registro normalizado
field_of() {
  echo "$1" | tr '|' '\n' | awk -F= -v k="$2" '$1 == k { sub(/^[^=]*=/, ""); print; exit }'
}

# Lista de features conocidas: carpetas reales, o la lista del roadmap si aún no existen
known_features() {
  if [ -d "$REPO_ROOT/src/features" ] && ls "$REPO_ROOT/src/features" >/dev/null 2>&1 \
     && [ -n "$(ls "$REPO_ROOT/src/features" 2>/dev/null | grep -v '^_template$')" ]; then
    ls "$REPO_ROOT/src/features" | grep -v '^_template$'
  else
    printf '%s\n' platform audit auth content landing catalog scheduling payments \
      clients delinquency loyalty notifications account store
  fi
}

ESTADOS_VALIDOS="no_iniciada en_progreso bloqueada en_revision terminada"
estado_valido() {
  local e
  for e in $ESTADOS_VALIDOS; do [ "$1" = "$e" ] && return 0; done
  return 1
}
