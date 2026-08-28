#!/usr/bin/env bash
# install-hooks.sh — apunta git a .githooks/ (Capa 2). Correr una vez por clon.
set -eu
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath .githooks
chmod +x .githooks/* scripts/*.sh scripts/rules/*.sh 2>/dev/null || true
echo "Hooks instalados: core.hooksPath = .githooks"
