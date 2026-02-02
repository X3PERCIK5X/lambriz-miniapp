# Lambriz — Telegram Bot + Mini App

Дата подготовки: 2 февраля 2026

## 1) Telegram-бот

Папка: `/Users/maksim/Desktop/Ламбриз бот`

### Установка и запуск
```bash
cd "/Users/maksim/Desktop/Ламбриз бот"
npm install
npm run start
```

### Настройки
Файл: `/Users/maksim/Desktop/Ламбриз бот/config.json`
- `botToken` — токен бота
- `webAppUrl` — URL Mini App (HTTPS)
- `logoPath` — путь к логотипу
- `welcomeText` — текст приветствия

Можно переопределить через переменные окружения:
`BOT_TOKEN`, `WEBAPP_URL`, `LOGO_PATH`, `WELCOME_TEXT`.

### Где менять URL Mini App
`/Users/maksim/Desktop/Ламбриз бот/config.json` → `webAppUrl`

---

## 2) Telegram Mini App (Web App)

Папка: `/Users/maksim/Desktop/Ламбриз миниапп`

### Установка и запуск
```bash
cd "/Users/maksim/Desktop/Ламбриз миниапп"
npm install
npm run start
```
Сервер поднимется на `http://localhost:3000`.

> Для работы в Telegram нужен HTTPS. Используйте внешний домен/сервер или туннель.

### Настройки
Файл: `/Users/maksim/Desktop/Ламбриз миниапп/config.json`
- `orderEmailTo` — получатель заявок
- `orderEmailFrom` — отправитель (from)
- `privacyPolicyUrl` — ссылка на политику
- `operatorName` — оператор персональных данных
- `smtp` — параметры SMTP для отправки email

Также поддерживаются переменные окружения:
`ORDER_EMAIL_TO`, `ORDER_EMAIL_FROM`, `PRIVACY_POLICY_URL`, `OPERATOR_NAME`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`.

### Где менять email получателя заявок
`/Users/maksim/Desktop/Ламбриз миниапп/config.json` → `orderEmailTo`

### Где редактировать каталог
- Категории: `/Users/maksim/Desktop/Ламбриз миниапп/data/categories.json`
- Товары: `/Users/maksim/Desktop/Ламбриз миниапп/data/products.json`

### Хранение данных пользователя
Файл создаётся автоматически:
`/Users/maksim/Desktop/Ламбриз миниапп/storage.json`

Там хранятся:
- данные пользователя
- избранное
- история заказов

---

## 3) Памятка по структуре
- Header и меню реализованы в `public/index.html`
- Логика экранов и маршрутов — `public/app.js`
- Стили — `public/styles.css`
- Сервер и API — `server.js`

Если нужно расширить функциональность — скажите, добавлю.
