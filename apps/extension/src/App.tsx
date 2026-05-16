import { useEffect, useState } from 'react'
import { LayoutDashboard, MessageSquareText, PanelsTopLeft, Sparkles } from 'lucide-react'
import { getStoredSession } from './lib/browser-storage'

const DEFAULT_API_URL =
  import.meta.env.VITE_API_URL ?? 'https://salonzap-crm-api.vercel.app'
const DEFAULT_WEB_URL =
  import.meta.env.VITE_WEB_URL ?? 'https://salonzap-crm-web.vercel.app'

function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    getStoredSession().then((stored) => {
      setApiUrl(stored.apiUrl)
      setConnected(Boolean(stored.token))
    })
  }, [])

  return (
    <main className="szp-popup">
      <div className="szp-popup-card">
        <div className="szp-popup-brand">
          <div className="szp-popup-badge">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="szp-kicker">SalonZap CRM</p>
            <h1>Extensao conectada ao WhatsApp Web</h1>
            <p className="szp-muted">O mesmo fluxo operacional do CRM acompanha o time tambem dentro do navegador.</p>
          </div>
        </div>

        <div className="szp-popup-info">
            <p><strong>Status:</strong> {connected ? 'autenticada' : 'aguardando login na sidebar'}</p>
            <p><strong>API:</strong> {apiUrl}</p>
        </div>

        <div className="szp-popup-actions">
          <a className="szp-secondary szp-popup-button" href="https://web.whatsapp.com" target="_blank" rel="noreferrer">
            Abrir WhatsApp Web
          </a>
          <a className="szp-secondary szp-popup-button" href={`${DEFAULT_WEB_URL}/contacts`} target="_blank" rel="noreferrer">
            <LayoutDashboard size={16} />
            Abrir painel
          </a>
        </div>

        <div className="szp-popup-grid">
          <div className="szp-popup-grid-card">
            <MessageSquareText size={18} />
            <p><strong>Respostas rapidas</strong></p>
            <p className="szp-muted">Use atalhos compartilhados com o painel web.</p>
          </div>
          <div className="szp-popup-grid-card">
            <PanelsTopLeft size={18} />
            <p><strong>Funil sincronizado</strong></p>
            <p className="szp-muted">Mova contatos entre etapas sem sair do WhatsApp Web.</p>
          </div>
        </div>

        <ol className="szp-popup-steps">
          <li>1. Abra `web.whatsapp.com`.</li>
          <li>2. Entre na sidebar com a mesma conta usada no painel web.</li>
          <li>3. Clique em uma resposta rapida, mova o contato no funil ou use o botao de IA.</li>
        </ol>
      </div>
    </main>
  )
}

export default App
