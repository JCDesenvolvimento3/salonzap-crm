import { defaultWelcomeMessage, syncBaselineSetup } from '../src/auth/auth-provisioning'

type BootstrapConfig = {
  salonName: string
  salonSlug: string
  adminName: string
  adminEmail: string
  adminPassword: string
  brandColor: string
  timezone: string
  welcomeMessage: string
}

function requiredEnv(key: string) {
  const value = process.env[key]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, fallback: string) {
  return process.env[key]?.trim() || fallback
}

export function getBootstrapConfig(): BootstrapConfig {
  return {
    salonName: requiredEnv('SALONZAP_SALON_NAME'),
    salonSlug: requiredEnv('SALONZAP_SALON_SLUG'),
    adminName: requiredEnv('SALONZAP_ADMIN_NAME'),
    adminEmail: requiredEnv('SALONZAP_ADMIN_EMAIL').toLowerCase(),
    adminPassword: requiredEnv('SALONZAP_ADMIN_PASSWORD'),
    brandColor: optionalEnv('SALONZAP_BRAND_COLOR', '#7FE8FF'),
    timezone: optionalEnv('SALONZAP_TIMEZONE', 'America/Sao_Paulo'),
    welcomeMessage: optionalEnv('SALONZAP_WELCOME_MESSAGE', defaultWelcomeMessage),
  }
}

export { syncBaselineSetup }
