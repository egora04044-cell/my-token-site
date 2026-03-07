#!/bin/bash
# Диагностика сервера — запустите на сервере: bash scripts/server-check.sh

echo "=== 1. PM2 статус ==="
pm2 status 2>/dev/null || echo "PM2 не найден"

echo ""
echo "=== 2. PM2 логи (последние 20 строк) ==="
pm2 logs my-token-site --lines 20 --nostream 2>/dev/null || echo "Нет логов"

echo ""
echo "=== 3. Процесс на порту 3000 ==="
lsof -i :3000 2>/dev/null || ss -tlnp | grep 3000 2>/dev/null || echo "Порт 3000 не занят"

echo ""
echo "=== 4. Содержимое .next ==="
ls -la /var/www/my-token-site/.next 2>/dev/null | head -5 || echo ".next не найден"

echo ""
echo "=== 5. node_modules ==="
ls /var/www/my-token-site/node_modules/next 2>/dev/null && echo "Next.js установлен" || echo "node_modules отсутствует или повреждён"

echo ""
echo "=== 6. Тест локального запроса ==="
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || echo "Сервер не отвечает"
