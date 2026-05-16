# SalonZap Web

Aplicacao Next.js do painel web e da landing publica do SalonZap CRM.

## Rotas principais

- `/login`
- `/signup`
- `/dashboard`
- `/contacts`
- `/kanban`
- `/campaigns`
- `/quick-replies`
- `/reminders`
- `/settings`

## Ambiente local

Use as variaveis da raiz do monorepo:

```env
NEXT_PUBLIC_API_URL="http://localhost:3333"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_SUPPORT_EMAIL="jsstorebrazil@gmail.com"
NEXT_PUBLIC_SALES_EMAIL="jsstorebrazil@gmail.com"
NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
```

## Comandos

```bash
npm run dev -w @salonzap/web
npm run lint -w @salonzap/web
npm run build -w @salonzap/web
```
