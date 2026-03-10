#!/bin/bash
# Deploy script for nextuplabel.online
# Run on the server: ./deploy.sh

set -e
cd "$(dirname "$0")"

echo "=== Installing dependencies ==="
npm ci

echo "=== Building ==="
npm run build

echo "=== Restarting PM2 ==="
if pm2 describe nextuplabel > /dev/null 2>&1; then
    pm2 restart nextuplabel
else
    pm2 start ecosystem.config.cjs
fi

pm2 save
echo "=== Done ==="
