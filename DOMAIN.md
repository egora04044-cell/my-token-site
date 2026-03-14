# Смена домена сайта (свой сервер)

## Шаг 1. Купить домен

Зарегистрируйте домен на Namecheap, Reg.ru, Cloudflare или другом регистраторе.

---

## Шаг 2. DNS

В панели управления доменом добавьте A-записи:

| Тип | Имя | Значение |
|-----|-----|----------|
| A   | @   | IP вашего сервера |
| A   | www | IP вашего сервера |

---

## Шаг 3. Файл .env.local на сервере

Подключитесь к серверу по SSH и отредактируйте `.env.local` в папке проекта:

```bash
cd /var/www/my-token-site
nano .env.local
```

Добавьте или измените строку (подставьте свой домен):

```
NEXT_PUBLIC_SITE_URL=https://ваш-домен.com
```

Сохраните: `Ctrl+O`, Enter, `Ctrl+X`.

**Пример** (если домен viralviralviral.com):

```
NEXT_PUBLIC_PHANTOM_APP_ID=ваш-phantom-id
NEXT_PUBLIC_SITE_URL=https://viralviralviral.com
```

---

## Шаг 4. Nginx

Отредактируйте конфиг Nginx:

```bash
sudo nano /etc/nginx/sites-available/nextuplabel
```

Замените `server_name` на новый домен:

```
server_name ваш-домен.com www.ваш-домен.com;
```

Проверьте и перезагрузите:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Шаг 5. SSL (HTTPS)

```bash
sudo certbot --nginx -d ваш-домен.com -d www.ваш-домен.com
```

---

## Шаг 6. Пересборка и перезапуск

```bash
cd /var/www/my-token-site
npm run build
pm2 restart my-token-site
```

---

## Шаг 7. Phantom

1. Зайдите в [Phantom Developer Dashboard](https://phantom.app/developer)
2. Добавьте новый домен в список разрешённых
3. Укажите redirect URL: `https://ваш-домен.com/auth/callback`

---

## Краткий чеклист

- [ ] Купить домен
- [ ] Настроить DNS (A-записи)
- [ ] Добавить `NEXT_PUBLIC_SITE_URL` в `.env.local`
- [ ] Обновить `server_name` в Nginx
- [ ] Получить SSL (certbot)
- [ ] `npm run build` + `pm2 restart my-token-site`
- [ ] Добавить домен в Phantom Dashboard
