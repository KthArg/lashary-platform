#!/usr/bin/env bash
# check-tooling-hash.sh — SEC-008: todo lo vendorizado en vendor/tools/ está en el allowlist
# (docs/spec/tooling-allowlist.yaml) y su hash de contenido coincide con el registrado.

. "$(dirname "$0")/lib.sh"

ALLOWLIST="$REPO_ROOT/docs/spec/tooling-allowlist.yaml"
VENDOR_DIR="$REPO_ROOT/vendor/tools"

dir_hash() { # hash determinista del contenido de un directorio
  (cd "$1" && find . -type f | sort | xargs sha256sum | sha256sum | cut -d' ' -f1)
}

if [ ! -d "$VENDOR_DIR" ] && [ ! -f "$ALLOWLIST" ]; then
  echo "Sin herramientas vendorizadas ni allowlist — OK (SEC-008 aplica cuando exista la primera)."
  finish "check-tooling-hash"
fi

# Entradas del allowlist: pares path/sha256
if [ -f "$ALLOWLIST" ]; then
  paste -d'|' \
    <(grep -E "^\s*-?\s*path:" "$ALLOWLIST" | sed -E 's/.*path:\s*//') \
    <(grep -E "^\s*sha256:" "$ALLOWLIST" | sed -E 's/.*sha256:\s*//') | \
  while IFS='|' read -r p h; do
    [ -z "$p" ] && continue
    if [ ! -d "$REPO_ROOT/$p" ]; then
      echo "SEC-008|el allowlist registra '$p' pero el directorio no existe"
      continue
    fi
    actual=$(dir_hash "$REPO_ROOT/$p")
    if [ "$actual" != "$h" ]; then
      echo "SEC-008|'$p' no coincide con su hash registrado (registrado ${h:0:12}…, actual ${actual:0:12}…) — contenido cambió sin re-review"
    fi
  done > "$REPO_ROOT/.tool-violations.tmp" || true
else
  : > "$REPO_ROOT/.tool-violations.tmp"
fi

# Directorios vendorizados que el allowlist no registra
if [ -d "$VENDOR_DIR" ]; then
  for d in "$VENDOR_DIR"/*/; do
    [ -e "$d" ] || continue
    rel="${d#"$REPO_ROOT"/}"; rel="${rel%/}"
    if [ ! -f "$ALLOWLIST" ] || ! grep -q "path:.*$rel" "$ALLOWLIST"; then
      echo "SEC-008|'$rel' está vendorizado pero no registrado en el allowlist — correr /auditar-herramienta primero" >> "$REPO_ROOT/.tool-violations.tmp"
    fi
  done
fi

while IFS='|' read -r rid detail; do
  [ -n "$rid" ] && fail_rule "$rid" "$detail"
done < "$REPO_ROOT/.tool-violations.tmp"
rm -f "$REPO_ROOT/.tool-violations.tmp"

finish "check-tooling-hash"
