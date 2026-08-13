#!/usr/bin/env bash
#
# Redeploy Polycon on the server:
#   /var/www/polycon/deploy.sh
#
# dist/ is built locally and committed, so the server needs no Node, no npm
# and no build step -- it only fetches the finished files. nginx serves them
# straight off disk, so there is nothing to restart.

set -euo pipefail
cd "$(dirname "$0")"

echo "==> Pulling latest from main"
git pull --ff-only origin main

echo "==> Now serving:"
ls -la dist/

echo "==> Done."
