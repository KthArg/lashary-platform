#!/usr/bin/env bash
# check-migrations.sh — INT-008: máx. 1 migración nueva por PR, forward-only (las existentes no
# se editan) · DOM-001: columnas de dinero con tipo no entero · DOM-003: timestamp sin zona ·
# PERF-003: FK sin índice en la misma migración · ARCH-006: prefijo de feature en tablas nuevas.

. "$(dirname "$0")/lib.sh"

MIG_DIR="supabase/migrations"

# ── Parte 1: contra el diff (si hay) ─────────────────────────────
STATUS=$(all_touched_files | grep "	$MIG_DIR/" || true)
if [ -n "$STATUS" ]; then
  N_NEW=$(echo "$STATUS" | grep -c '^A' || true)
  N_EDITED=$(echo "$STATUS" | grep -cE '^[MDR]' || true)
  if [ "$N_NEW" -gt 1 ]; then
    fail_rule INT-008 "el diff agrega $N_NEW migraciones (máximo 1 por PR): $(echo "$STATUS" | grep '^A' | cut -f2 | tr '\n' ' ')"
  fi
  if [ "$N_EDITED" -gt 0 ]; then
    fail_rule INT-008 "el diff modifica o borra migraciones existentes (forward-only): $(echo "$STATUS" | grep -E '^[MDR]' | cut -f2 | tr '\n' ' ')"
  fi
fi

# ── Parte 2: lint del contenido de TODAS las migraciones ─────────
if [ ! -d "$REPO_ROOT/$MIG_DIR" ]; then
  echo "Sin $MIG_DIR todavía — lint de contenido omitido."
  finish "check-migrations"
fi

PREFIXES=$(known_features | tr '\n' '|' | sed 's/|$//')
MONEY_NAMES="price|amount|deposit|balance|total|monto|precio|anticipo|saldo|charge|fee"

for mig in "$REPO_ROOT/$MIG_DIR"/*.sql; do
  [ -e "$mig" ] || continue
  rel="${mig#"$REPO_ROOT"/}"

  # DOM-003 — timestamp sin zona
  grep -niE "timestamp([[:space:]]*\(|[[:space:]]+without|[[:space:]]+(not[[:space:]]+null|null|default|primary|unique|,|\)))" "$mig" | grep -viE "timestamptz|with time zone" | \
  while IFS=: read -r ln content; do
    echo "DOM-003|$rel:$ln usa 'timestamp' sin zona — debe ser timestamptz: $(echo "$content" | sed 's/^[[:space:]]*//' | cut -c1-80)"
  done

  # DOM-001 — columna con nombre de dinero y tipo no entero
  grep -niE "\b($MONEY_NAMES)[a-z_]*[[:space:]]+(real|float[48]?|double[[:space:]]+precision|numeric[[:space:]]*\([0-9]+,[[:space:]]*[1-9])" "$mig" | \
  while IFS=: read -r ln content; do
    echo "DOM-001|$rel:$ln columna de dinero con tipo no entero: $(echo "$content" | sed 's/^[[:space:]]*//' | cut -c1-80)"
  done

  # ARCH-006 — prefijo de feature en create table
  grep -niE "create[[:space:]]+table" "$mig" | \
  while IFS=: read -r ln content; do
    tname=$(echo "$content" | sed -nE 's/.*create[[:space:]]+table[[:space:]]+(if[[:space:]]+not[[:space:]]+exists[[:space:]]+)?"?(public\.)?"?([a-z_]+).*/\3/Ip')
    [ -z "$tname" ] && continue
    if ! echo "$tname" | grep -qE "^($PREFIXES)_"; then
      echo "ARCH-006|$rel:$ln tabla '$tname' sin prefijo de feature válido ($(known_features | tr '\n' ' '))"
    fi
  done

  # PERF-003 — references sin create index de la columna en la misma migración
  grep -niE "^[^-]*[a-z_]+[[:space:]]+[a-z]+[a-z_ ]*references[[:space:]]" "$mig" | \
  while IFS=: read -r ln content; do
    col=$(echo "$content" | sed -nE 's/^[[:space:]]*"?([a-z_]+)"?[[:space:]].*/\1/p')
    [ -z "$col" ] && continue
    if ! grep -qiE "create[[:space:]]+index.*\b$col\b" "$mig"; then
      echo "PERF-003|$rel:$ln FK '$col' sin índice en la misma migración (create index ... ($col))"
    fi
  done
done > "$REPO_ROOT/.mig-violations.tmp" || true

while IFS='|' read -r rid detail; do
  [ -n "$rid" ] && fail_rule "$rid" "$detail"
done < "$REPO_ROOT/.mig-violations.tmp"
rm -f "$REPO_ROOT/.mig-violations.tmp"

finish "check-migrations"
