#!/usr/bin/env bash
# Pull the latest images, run migrations, restart. Set GHCR_USER and GHCR_TOKEN (read:packages) for a private package.
set -euo pipefail
cd "$(dirname "$0")"

for var in DOMAIN GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET SLACK_CLIENT_ID SLACK_CLIENT_SECRET; do
  grep -qE "^${var}=.+" .env || { echo "Missing ${var} in .env"; exit 1; }
done

if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:?set GHCR_USER}" --password-stdin
fi

COMPOSE="docker compose -f docker-compose.prod.yml"
$COMPOSE pull
$COMPOSE up -d mysql redis elasticsearch
$COMPOSE run --rm migrate
$COMPOSE up -d

sleep 10
curl -fsS "https://$(grep '^DOMAIN=' .env | cut -d= -f2)/api/health" && echo
$COMPOSE ps
