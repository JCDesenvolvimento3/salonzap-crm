import posthog from 'posthog-js'

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_TOKEN
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST

try {
  if (posthogToken && posthogHost) {
    posthog.init(posthogToken, {
      api_host: posthogHost,
      defaults: '2026-01-30',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      person_profiles: 'identified_only',
    })
  }
} catch (error) {
  console.error('Instrumentation bootstrap failed.', error)
}
