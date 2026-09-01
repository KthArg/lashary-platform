#!/usr/bin/env bash
# status-gen.sh — genera docs/STATUS.md desde los front-matter de src/features/*/SPEC.md
# más el backlog en docs/backlog/. EST-002: el archivo generado es la única versión legítima.
# Determinista: misma entrada → mismo byte de salida (CI compara, ver check-status-fresh.sh).
# Uso: scripts/status-gen.sh [archivo-salida]   (default: docs/STATUS.md)

set -eu
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/rules/lib.sh"

OUT="${1:-$REPO_ROOT/docs/STATUS.md}"
BACKLOG_CSV="$(ls "$REPO_ROOT/docs/backlog/"*.csv 2>/dev/null | head -n 1 || true)"

SPECS=$(ls "$REPO_ROOT"/src/features/*/SPEC.md 2>/dev/null | grep -v '/_template/' || true)
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

{
  echo "# Estado del proyecto"
  echo ""
  echo "> **GENERADO** por \`scripts/status-gen.sh\` — no editar a mano (EST-002)."

  if [ -z "$SPECS" ]; then
    echo "> Fuente: 0 specs de feature + \`docs/backlog/$(basename "${BACKLOG_CSV:-<sin backlog>}")\`."
    echo ""
    echo "## Features"
    echo ""
    echo "Sin features todavía. Proyecto sin iniciar: ninguna historia reclamada, ninguna línea de código de producto."
  else
    N_SPECS=$(echo "$SPECS" | wc -l | tr -d ' ')
    MAX_DATE=$(for s in $SPECS; do spec_records "$s" | awk -F'|' '$1=="META" && $2=="actualizado" {print $3}'; done | sort | tail -n 1)
    echo "> Fuente: $N_SPECS specs de feature + \`docs/backlog/$(basename "${BACKLOG_CSV:-<sin backlog>}")\`. Datos al: ${MAX_DATE:-desconocido}."
    echo ""
    echo "## Features"
    echo ""
    echo "| Feature | DRI | Estado | terminada / en_progreso / bloqueada / en_revision / no_iniciada |"
    echo "|---|---|---|---|"
    for s in $SPECS; do
      spec_records "$s" > "$TMP.rec"
      f=$(awk -F'|' '$1=="META" && $2=="feature" {print $3}' "$TMP.rec")
      dri=$(awk -F'|' '$1=="META" && $2=="dri" {print $3}' "$TMP.rec")
      est=$(awk -F'|' '$1=="META" && $2=="estado" {print $3}' "$TMP.rec")
      counts=$(awk -F'|' '$1=="HIST" {
          for (i=2; i<=NF; i++) if ($i ~ /^estado=/) { e=substr($i,8); c[e]++ }
        } END { printf "%d / %d / %d / %d / %d", c["terminada"], c["en_progreso"], c["bloqueada"], c["en_revision"], c["no_iniciada"] }' "$TMP.rec")
      echo "| $f | ${dri:--} | $est | $counts |"
    done

    echo ""
    echo "## Detalle por feature"
    for s in $SPECS; do
      spec_records "$s" > "$TMP.rec"
      f=$(awk -F'|' '$1=="META" && $2=="feature" {print $3}' "$TMP.rec")
      act=$(awk -F'|' '$1=="META" && $2=="actualizado" {print $3}' "$TMP.rec")
      echo ""
      echo "### $f (actualizado: ${act:-desconocido})"
      grep '^HIST|' "$TMP.rec" | while IFS= read -r r; do
        id=$(field_of "$r" id); e=$(field_of "$r" estado)
        extra=""
        ev=$(field_of "$r" evidencia); fa=$(field_of "$r" falta); bp=$(field_of "$r" bloqueada_por)
        [ -n "$ev" ] && extra=" — $ev"
        [ -n "$fa" ] && extra=" — falta: $fa"
        [ -n "$bp" ] && extra=" — bloqueada por $bp"
        echo "- $id — $e$extra"
      done
    done

    echo ""
    echo "## Bloqueos"
    BLOQ=$(for s in $SPECS; do spec_records "$s" | grep '^HIST|' | grep 'estado=bloqueada'; done || true)
    if [ -z "$BLOQ" ]; then echo ""; echo "Ninguno."; else
      echo "$BLOQ" | while IFS= read -r r; do
        echo "- $(field_of "$r" id) ← $(field_of "$r" bloqueada_por)"
      done
    fi

    echo ""
    echo "## Defectos conocidos"
    DEFE=$(for s in $SPECS; do
      f=$(spec_records "$s" | awk -F'|' '$1=="META" && $2=="feature" {print $3}')
      spec_records "$s" | grep '^DEFE|' | sed "s/^/$f: /"
    done || true)
    if [ -z "$DEFE" ]; then echo ""; echo "Ninguno registrado."; else
      echo "$DEFE" | while IFS= read -r r; do
        f="${r%%:*}"; rec="${r#*: }"
        echo "- $f: $(field_of "$rec" que) — \`$(field_of "$rec" donde)\` — $(field_of "$rec" issue)"
      done
    fi

    echo ""
    echo "## Deuda aceptada"
    DEUD=$(for s in $SPECS; do
      f=$(spec_records "$s" | awk -F'|' '$1=="META" && $2=="feature" {print $3}')
      spec_records "$s" | grep '^DEUD|' | sed "s/^/$f: /"
    done || true)
    if [ -z "$DEUD" ]; then echo ""; echo "Ninguna registrada."; else
      echo "$DEUD" | while IFS= read -r r; do
        f="${r%%:*}"; rec="${r#*: }"
        echo "- $f: $(field_of "$rec" que) — aceptada en $(field_of "$rec" aceptada_en) — costo: $(field_of "$rec" costo)"
      done
    fi

    echo ""
    echo "## Flags vivos"
    FLAGS=$(for s in $SPECS; do
      f=$(spec_records "$s" | awk -F'|' '$1=="META" && $2=="feature" {print $3}')
      spec_records "$s" | grep '^FLAG|' | sed "s/^/$f: /"
    done || true)
    if [ -z "$FLAGS" ]; then echo ""; echo "Ninguno."; else
      echo "$FLAGS" | while IFS= read -r r; do
        f="${r%%:*}"; rec="${r#*: }"
        echo "- $f: $(field_of "$rec" nombre) — $(field_of "$rec" estado) — dueño: $(field_of "$rec" dueno) — retiro: $(field_of "$rec" retiro)"
      done
    fi
  fi

  # ── Cruce con el backlog ─────────────────────────────────────────
  if [ -n "$BACKLOG_CSV" ]; then
    grep -o '"US-[A-Z]\+-[0-9]\+"' "$BACKLOG_CSV" | tr -d '"' | sort -u > "$TMP.backlog"
    : > "$TMP.claimed"
    if [ -n "$SPECS" ]; then
      for s in $SPECS; do
        spec_records "$s" | grep '^HIST|' | while IFS= read -r r; do field_of "$r" id; done
      done | sort -u > "$TMP.claimed"
    fi
    echo ""
    echo "## Historias del backlog sin feature que las reclame"
    UNCLAIMED=$(comm -23 "$TMP.backlog" "$TMP.claimed")
    if [ -z "$UNCLAIMED" ]; then echo ""; echo "Ninguna: toda historia del backlog tiene feature."; else
      echo ""
      echo "$UNCLAIMED" | sed 's/^/- /'
    fi
    UNKNOWN=$(comm -13 "$TMP.backlog" "$TMP.claimed")
    if [ -n "$UNKNOWN" ]; then
      echo ""
      echo "## Historias en specs ausentes del backlog (⊕ pendientes de alta en Jira)"
      echo ""
      echo "$UNKNOWN" | sed 's/^/- /'
    fi
  fi
} > "$TMP.out"

mkdir -p "$(dirname "$OUT")"
mv "$TMP.out" "$OUT"
rm -f "$TMP.rec" "$TMP.backlog" "$TMP.claimed" 2>/dev/null || true
echo "Generado: $OUT"
