import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'SalonZap CRM Sidebar',
  version: '0.1.0',
  description: 'Sidebar premium para operar contatos do WhatsApp Web conectada ao SalonZap CRM.',
  action: {
    default_title: 'SalonZap CRM',
    default_popup: 'index.html',
  },
  permissions: ['storage', 'clipboardWrite'],
  host_permissions: ['https://web.whatsapp.com/*'],
  content_scripts: [
    {
      matches: ['https://web.whatsapp.com/*'],
      js: ['src/content.tsx'],
    },
  ],
})
