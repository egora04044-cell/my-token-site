# Деплой nextuplabel.online

## Вариант 1: Vercel (рекомендуется)

Самый простой способ — Vercel бесплатно хостит Next.js.

1. Зарегистрируйтесь на [vercel.com](https://vercel.com)
2. Подключите репозиторий GitHub (или загрузите проект)
3. Домен `nextuplabel.online` добавьте в настройках проекта
4. Деплой происходит автоматически при каждом push

Все маршруты (`/`, `/admin`, `/exclusive`, `/exclusive/projects` и т.д.) будут работать.

---

## Вариант 2: Свой сервер (VPS)

### Требования

- Node.js 18+
- PM2 (для запуска приложения)
- Nginx (опционально, как reverse proxy)

### Шаг 1: Подготовка сервера

```bash
# Установка Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PM2
sudo npm install -g pm2
```

### Шаг 2: Загрузка проекта

```bash
# Клонирование (если есть Git)
git clone <ваш-репозиторий> /var/www/nextuplabel
cd /var/www/nextuplabel

# Или загрузка через scp/rsync с локальной машины:
# rsync -avz --exclude node_modules --exclude .next ./ user@server:/var/www/nextuplabel/
```

### Шаг 3: Первый деплой

```bash
cd /var/www/nextuplabel

# Установка зависимостей (production only)
npm ci --omit=dev

# Сборка
npm run build

# Запуск через PM2
pm2 start ecosystem.config.cjs

# Автозапуск при перезагрузке
pm2 startup
pm2 save
```

### Шаг 4: Nginx (если нужен HTTPS и домен)

```bash
# Копируем конфиг
sudo cp nginx.conf.example /etc/nginx/sites-available/nextuplabel
sudo ln -s /etc/nginx/sites-available/nextuplabel /etc/nginx/sites-enabled/

# Редактируем (укажите путь к SSL-сертификатам)
sudo nano /etc/nginx/sites-available/nextuplabel

# Проверка и перезагрузка
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 5: Обновление (после изменений в коде)

```bash
cd /var/www/nextuplabel

# Если используете Git
git pull

# Деплой
./deploy.sh
# или вручную:
npm ci --omit=dev
npm run build
pm2 restart nextuplabel
```

---

## Важные моменты

1. **Порт 3000** — Next.js по умолчанию слушает 3000. В `ecosystem.config.cjs` можно изменить `PORT`.
2. **Переменные окружения** — если нужны API-ключи или секреты, создайте `.env.local` или задайте их в PM2.
3. **Данные** — папки `data/` и `public/uploads/` создаются автоматически. При деплое не удаляйте их — там хранятся загруженные файлы и метаданные.
