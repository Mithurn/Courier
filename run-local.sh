#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "🚀 Starting Courier local environment..."

if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

echo "📦 Starting backing services (MySQL, Redis, Elasticsearch)..."
docker compose up -d

# Prepare backend env if missing
if [ ! -f "backend/.env" ]; then
  echo "⚠️ backend/.env not found, creating from .env.example..."
  cp backend/.env.example backend/.env
fi

# Wait for MySQL to accept connections
echo "⏳ Waiting for MySQL to accept connections..."
for i in {1..30}; do
  if docker compose exec -T mysql mysqladmin ping -h localhost -uroot -pcourier --silent >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "⚙️ Applying database migrations..."
(cd backend && npx prisma migrate deploy)

# Start API, Worker, and Frontend
echo "✨ Starting API, Worker, and Frontend..."

(cd backend && npm run dev) &
API_PID=$!

(cd backend && npm run worker) &
WORKER_PID=$!

(cd frontend && npm run dev) &
FRONTEND_PID=$!

cleanup() {
  trap - INT TERM EXIT
  echo ""
  echo "🛑 Stopping Courier..."
  kill "$API_PID" "$WORKER_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$API_PID" "$WORKER_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "👋 Done."
  exit 0
}

trap cleanup INT TERM

echo ""
echo "=================================================="
echo "  Courier is running locally!"
echo "  • Frontend:    http://localhost:5173"
echo "  • Bull Board:  http://localhost:4000/admin/queues"
echo "  • API Docs:    http://localhost:4000/docs"
echo "  • Health:      http://localhost:4000/health"
echo "=================================================="
echo "Press Ctrl+C to stop all services."
echo ""

wait
