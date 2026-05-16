declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initCodeClient: (config: {
            client_id: string
            scope: string
            ux_mode: 'popup'
            redirect_uri: string
            callback: (response: { code?: string; error?: string; error_description?: string }) => void
            error_callback?: () => void
          }) => {
            requestCode: () => void
          }
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadGoogleScript() {
  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google OAuth so pode ser iniciado no navegador.'))
      return
    }

    if (window.google?.accounts?.oauth2) {
      resolve()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o script do Google.')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar o script do Google.'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export async function requestGoogleAuthCode({
  clientId,
  redirectUri,
}: {
  clientId: string
  redirectUri: string
}) {
  if (!clientId.trim()) {
    throw new Error('Login com Google ainda nao esta configurado.')
  }

  await loadGoogleScript()

  return new Promise<string>((resolve, reject) => {
    const codeClient = window.google?.accounts?.oauth2?.initCodeClient({
      client_id: clientId,
      scope: 'openid email profile',
      ux_mode: 'popup',
      redirect_uri: redirectUri,
      callback: (response) => {
        if (response.error || !response.code) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                'Nao foi possivel concluir o login com Google.',
            ),
          )
          return
        }

        resolve(response.code)
      },
      error_callback: () => {
        reject(new Error('Nao foi possivel abrir o login com Google.'))
      },
    })

    if (!codeClient) {
      reject(new Error('Google OAuth indisponivel neste navegador.'))
      return
    }

    codeClient.requestCode()
  })
}
