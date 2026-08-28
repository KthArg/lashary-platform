#!/usr/bin/env bash
# check-frontmatter.sh — EST-001 vocabulario cerrado · EST-004 bloqueos con bloqueador y
# faltantes nombrados · EST-005 terminada con evidencia · INT-004 flags con dueño y retiro vigente.
# Valida TODOS los src/features/*/SPEC.md (no depende del diff).

. "$(dirname "$0")/lib.sh"

# _template queda fuera: sus marcadores <asi> son su propósito, no una violación
SPECS=$(ls "$REPO_ROOT"/src/features/*/SPEC.md 2>/dev/null | grep -v '/_template/' || true)
if [ -z "$SPECS" ]; then
  echo "Sin specs de feature todavía — nada que validar."
  finish "check-frontmatter"
fi

TODAY=$(date +%Y-%m-%d)

for s in $SPECS; do
  rel="${s#"$REPO_ROOT"/}"

  # Estado de la feature
  fest=$(spec_records "$s" | awk -F'|' '$1=="META" && $2=="estado" {print $3}')
  if [ -z "$fest" ]; then
    fail_rule EST-001 "$rel: falta 'estado:' a nivel de feature"
  elif ! estado_valido "$fest"; then
    fail_rule EST-001 "$rel: estado de feature '$fest' fuera del vocabulario ($ESTADOS_VALIDOS)"
  fi

  # Historias
  spec_records "$s" | grep '^HIST|' | while IFS= read -r r; do
    id=$(field_of "$r" id); e=$(field_of "$r" estado)
    if [ -z "$e" ] || ! estado_valido "$e"; then
      echo "EST-001|$rel: historia $id con estado '$e' fuera del vocabulario"
      continue
    fi
    case "$e" in
      bloqueada)
        [ -z "$(field_of "$r" bloqueada_por)" ] && echo "EST-004|$rel: $id está bloqueada sin 'bloqueada_por:' — un bloqueo sin bloqueador es una excusa" ;;
      terminada)
        [ -z "$(field_of "$r" evidencia)" ] && echo "EST-005|$rel: $id marcada terminada sin 'evidencia:' (el PR que la cerró)" ;;
      en_progreso)
        [ -z "$(field_of "$r" falta)" ] && echo "EST-004|$rel: $id en_progreso sin 'falta:' — el faltante se nombra en una frase concreta" ;;
    esac
  done > "$REPO_ROOT/.fm-violations.tmp" || true
  while IFS='|' read -r rid detail; do
    [ -n "$rid" ] && fail_rule "$rid" "$detail"
  done < "$REPO_ROOT/.fm-violations.tmp"
  rm -f "$REPO_ROOT/.fm-violations.tmp"

  # Flags: dueño y fecha de retiro presentes y no vencida
  spec_records "$s" | grep '^FLAG|' | while IFS= read -r r; do
    n=$(field_of "$r" nombre); ret=$(field_of "$r" retiro); due=$(field_of "$r" dueno)
    [ -z "$due" ] && echo "INT-004|$rel: flag '$n' sin dueño"
    if [ -z "$ret" ]; then
      echo "INT-004|$rel: flag '$n' sin fecha de retiro"
    elif [ "$ret" \< "$TODAY" ]; then
      echo "INT-004|$rel: flag '$n' venció el $ret y sigue vivo — los flags se borran"
    fi
  done > "$REPO_ROOT/.fm-violations.tmp" || true
  while IFS='|' read -r rid detail; do
    [ -n "$rid" ] && fail_rule "$rid" "$detail"
  done < "$REPO_ROOT/.fm-violations.tmp"
  rm -f "$REPO_ROOT/.fm-violations.tmp"
done

finish "check-frontmatter"
