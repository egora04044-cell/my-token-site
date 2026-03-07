#!/bin/bash
# Запускать на сервере
set -e
cd /var/www/my-token-site && git pull && NODE_OPTIONS=--max-old-space-size=4096 npx next build --webpack && pm2 restart my-token-site
