#!/usr/bin/env bash
# pr-capturas.sh — INT-010: sube las capturas de Playwright de un PR a la rama huérfana
# `capturas-pr` y devuelve el markdown para pegar en la sección "Capturas" del PR.
# Las imágenes nunca entran a main: viven en una carpeta por rama (feat/us-x → feat-us-x),
# y el PR las muestra con enlaces /raw/ (el repositorio es público).
#
# Uso: bash scripts/pr-capturas.sh [carpeta]   (por defecto .capturas-pr/, ignorada por git)
set -euo pipefail

dir="${1:-.capturas-pr}"
[ -d "$dir" ] || { echo "No existe la carpeta '$dir' — toma las capturas primero (INT-010)." >&2; exit 1; }
shopt -s nullglob
files=("$dir"/*.png "$dir"/*.jpg "$dir"/*.jpeg)
[ ${#files[@]} -gt 0 ] || { echo "Sin imágenes en '$dir'." >&2; exit 1; }

branch=$(git rev-parse --abbrev-ref HEAD)
slug=${branch//\//-}
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
tmp=$(mktemp -d)
trap 'git worktree remove --force "$tmp" >/dev/null 2>&1 || true' EXIT

if git ls-remote --exit-code --heads origin capturas-pr >/dev/null; then
  git fetch -q origin capturas-pr
  base=FETCH_HEAD
else # primera vez: raíz vacía, sin historia de main
  base=$(git commit-tree "$(git hash-object -t tree /dev/null)" -m "chore(ci): rama de capturas de PR (INT-010)")
fi
git worktree add -q --detach "$tmp" "$base"

mkdir -p "$tmp/$slug"
cp "${files[@]}" "$tmp/$slug/"
git -C "$tmp" add "$slug"
if git -C "$tmp" diff --cached --quiet; then
  echo "Las capturas ya estaban subidas." >&2
else
  git -C "$tmp" commit -q -m "chore(ci): capturas de $branch (INT-010)"
  git -C "$tmp" push -q origin HEAD:refs/heads/capturas-pr \
    || { echo "Push rechazado (otra persona subió capturas a la vez): vuelve a correr el script." >&2; exit 1; }
fi

echo "## Capturas"
echo
for f in "${files[@]}"; do
  name=$(basename "$f")
  echo "![${name%.*}](https://github.com/$repo/raw/capturas-pr/$slug/${name// /%20})"
  echo "_${name%.*}: <qué muestra>_"
  echo
done
