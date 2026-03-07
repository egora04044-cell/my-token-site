#!/bin/bash
set -e
cd /var/www/my-token-site

echo "=== 1. Git pull ==="
git pull origin main

echo "=== 2. Install dependencies ==="
npm install

echo "=== 3. Build ==="
NODE_OPTIONS=--max-old-space-size=4096 npx next build --webpack

echo "=== 4. Restart PM2 ==="
pm2 restart my-token-site

echo "=== Done! ==="
pm2 status my-token-site
