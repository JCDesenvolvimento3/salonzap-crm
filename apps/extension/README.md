# SalonZap Extension

Chrome MV3 extension for `web.whatsapp.com` with a CRM sidebar connected to the SalonZap production API.

## What it does

- injects a fixed sidebar inside WhatsApp Web
- syncs the current chat into the CRM
- shows the contact stage, tags, notes, and reminders
- lets the operator move the contact in the funnel
- applies quick replies directly into the WhatsApp composer
- creates notes and reminders without leaving the chat
- uses the real AI endpoints to suggest replies and analyze intent

## Default production targets

- web: `https://salonzap-crm-web.vercel.app`
- api: `https://salonzap-crm-api.vercel.app`

## Local development

```bash
npm run dev -w @salonzap/extension
```

## Production build

```bash
npm run build -w @salonzap/extension
npm run package:extension
```

The final zip is generated at:

```text
artifacts/salonzap-extension.zip
```

## Loading in Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `apps/extension/dist`
5. Open `https://web.whatsapp.com`
6. Log in to the sidebar with the same account used in the SalonZap web app

## Notes

- the manifest already allows `web.whatsapp.com` and the published production API
- the sidebar defaults to the production API, but still accepts a manual API URL when needed
