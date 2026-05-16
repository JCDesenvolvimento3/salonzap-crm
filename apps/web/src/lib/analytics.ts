import posthog from 'posthog-js'
import type { AuthSession } from '@salonzap/sdk'

function posthogEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_TOKEN)
}

export function identifyAnalyticsUser(session: AuthSession) {
  if (posthogEnabled()) {
    posthog.identify(session.user.id, {
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      salonId: session.user.salonId,
      salonName: session.salon.name,
      salonSlug: session.salon.slug,
    })
  }
}

export function resetAnalyticsUser() {
  if (posthogEnabled()) {
    posthog.reset()
  }
}

export function captureAnalyticsEvent(event: string, properties?: Record<string, unknown>) {
  if (!posthogEnabled()) {
    return
  }

  posthog.capture(event, properties)
}

export function captureClientException(error: unknown, context?: Record<string, Record<string, unknown>>) {
  if (posthogEnabled()) {
    posthog.capture('client_exception', {
      message: error instanceof Error ? error.message : 'unknown-client-error',
      ...(context ?? {}),
    })
  }

  console.error(error)
}
