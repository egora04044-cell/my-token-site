#!/bin/bash
# Deploy script for viralviralviral.com
# Run on the server: ./deploy.sh

set -e
cd "$(dirname "$0")"

echo "=== Installing dependencies ==="
npm ci

echo "=== Building ==="
npm run build

echo "=== Restarting PM2 ==="
if pm2 describe my-token-site > /dev/null 2>&1; then
    pm2 restart my-token-site
else
    pm2 start ecosystem.config.cjs
fi

pm2 save
echo "=== Done ==="
