# Настройка Nginx для viralviralviral.com

## Вариант 1: У вас уже есть рабочий Nginx (просто меняете домен)

### Шаг 1. Откройте конфиг

```bash
sudo nano /etc/nginx/sites-available/nextuplabel
```

(Если файл называется иначе — например `default` — откройте его)

### Шаг 2. Замените домен

Найдите строку `server_name` и замените старый домен на новый:

**Было:**
```
server_name nextuplabel.online www.nextuplabel.online;
```

**Стало:**
```
server_name viralviralviral.com www.viralviralviral.com;
```

Если есть блок для HTTPS (listen 443) — замените `server_name` и там.

### Шаг 3. Сохраните и проверьте

```bash
# Сохранить в nano: Ctrl+O, Enter, Ctrl+X

# Проверить конфиг на ошибки
sudo nginx -t

# Если OK — перезагрузить Nginx
sudo systemctl reload nginx
```

---

## Вариант 2: Первая настройка Nginx с нуля

### Шаг 1. Скопируйте готовый конфиг из проекта

```bash
cd /var/www/my-token-site
sudo cp nginx.viralviralviral.conf /etc/nginx/sites-available/nextuplabel
```

Или создайте вручную:

```bash
sudo nano /etc/nginx/sites-available/nextuplabel
```

### Шаг 2. Вставьте этот конфиг

Замените `viralviralviral.com` на свой домен, если другой:

```nginx
server {
    listen 80;
    server_name viralviralviral.com www.viralviralviral.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

Сохраните: `Ctrl+O`, Enter, `Ctrl+X`.

### Шаг 3. Подключите конфиг

```bash
sudo ln -s /etc/nginx/sites-available/nextuplabel /etc/nginx/sites-enabled/
```

### Шаг 4. Удалите дефолтный конфиг (если мешает)

```bash
# Проверьте, есть ли default
ls /etc/nginx/sites-enabled/

# Если default конфликтует — отключите
sudo rm /etc/nginx/sites-enabled/default
```

### Шаг 5. Проверка и перезагрузка

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Шаг 6. SSL (HTTPS)

После того как сайт открывается по HTTP:

```bash
sudo certbot --nginx -d viralviralviral.com -d www.viralviralviral.com
```

Certbot сам добавит SSL в конфиг и настроит редирект с HTTP на HTTPS.

---

## Полезные команды

| Команда | Описание |
|---------|----------|
| `sudo nginx -t` | Проверить конфиг на ошибки |
| `sudo systemctl reload nginx` | Перезагрузить Nginx без даунтайма |
| `sudo systemctl restart nginx` | Полный перезапуск Nginx |
| `sudo systemctl status nginx` | Статус Nginx |
| `sudo tail -f /var/log/nginx/error.log` | Смотреть ошибки в реальном времени |

---

## Проверка

1. Сайт открывается по `http://viralviralviral.com` (до SSL)
2. После certbot — по `https://viralviralviral.com`
3. HTTP автоматически перенаправляет на HTTPS
