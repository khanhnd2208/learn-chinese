#!/usr/bin/env bash
# Deploy Learn Chinese to VPS (run on server after git pull)
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

echo "==> Installing dependencies..."
npm ci

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Applying database migrations..."
npx prisma migrate deploy

echo "==> Purging legacy demo sets (one canonical Excel sample only)..."
npx tsx scripts/purge-legacy-demo-sets.ts

echo "==> Verifying import sample workbook..."
npx tsx scripts/verify-user-set-sample.ts

echo "==> Running tests..."
npm test

echo "==> Building production..."
npm run build

echo "==> Deploy complete. Start with: npm start (port 3001)"
echo "    Or PM2 fork (required for Hanzi AI rate limits):"
echo "    pm2 start ecosystem.config.cjs"
echo "    pm2 save"
