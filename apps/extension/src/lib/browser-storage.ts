export const STORAGE_KEYS = {
  apiUrl: 'salonzap_api_url',
  token: 'salonzap_token',
}

export async function getStoredSession() {
  const values = await chrome.storage.local.get([STORAGE_KEYS.apiUrl, STORAGE_KEYS.token])
  const defaultApiUrl =
    import.meta.env.VITE_API_URL ?? 'https://salonzap-crm-api.vercel.app'

  return {
    apiUrl: (values[STORAGE_KEYS.apiUrl] as string | undefined) ?? defaultApiUrl,
    token: (values[STORAGE_KEYS.token] as string | undefined) ?? null,
  }
}

export async function setStoredSession(apiUrl: string, token: string | null) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.apiUrl]: apiUrl,
    [STORAGE_KEYS.token]: token,
  })
}
