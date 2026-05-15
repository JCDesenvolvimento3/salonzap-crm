import { useEffect, useState } from 'react'
import { MessageSquareText, PanelsTopLeft, Sparkles } from 'lucide-react'
import { getStoredSession } from './lib/browser-storage'

function App() {
  const [apiUrl, setApiUrl] = useState('http://localhost:3333')
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
            <p className="szp-muted">A mesma linguagem visual premium agora acompanha o time tambem dentro do navegador.</p>
          </div>
        </div>

        <div className="szp-popup-info">
          <p><strong>Status:</strong> {connected ? 'autenticada' : 'aguardando login na sidebar'}</p>
          <p><strong>API:</strong> {apiUrl}</p>
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
            <p className="szp-muted">Mova contatos entre stages sem sair do WhatsApp Web.</p>
          </div>
        </div>

        <ol className="szp-popup-steps">
          <li>1. Abra `web.whatsapp.com`.</li>
          <li>2. Entre na sidebar com `admin@salonzap.local`.</li>
          <li>3. Clique em uma resposta rapida ou mova o contato no funil.</li>
        </ol>
      </div>
    </main>
  )
}

export default App
