#!/usr/bin/env bash
#
# Redeploy Polycon on the server:
#   /var/www/polycon/deploy.sh
#
# dist/ is gitignored, so the server builds from source after pulling.
# If the typecheck fails, vite never runs and the previous dist/ is left
# untouched -- a broken commit cannot take the site down.

set -euo pipefail
cd "$(dirname "$0")"

echo "==> Pulling latest from main"
git pull --ff-only origin main

# --include=dev because vite/typescript are devDependencies; a server with
# NODE_ENV=production set would otherwise skip them and break the build.
echo "==> Installing dependencies"
npm ci --include=dev

echo "==> Building (tsc --noEmit && vite build)"
npm run build

echo "==> Done. nginx serves $(pwd)/dist"
