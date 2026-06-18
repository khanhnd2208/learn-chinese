#!/usr/bin/env bash
# Deploy Learn Chinese to VPS (run on server after git pull)
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

echo "==> Installing dependencies..."
npm ci

echo "==> Applying database migrations..."
npx prisma migrate deploy

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Running tests..."
npm test

echo "==> Building production..."
npm run build

echo "==> Deploy complete. Start with: npm start (port 3001)"
echo "    Or restart PM2: pm2 restart learn-chinese"
