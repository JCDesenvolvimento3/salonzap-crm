import ReactDOM from 'react-dom/client'
import './index.css'
import { SidebarApp } from './sidebar-app'

const rootId = 'salonzap-extension-root'

if (!document.getElementById(rootId)) {
  const container = document.createElement('div')
  container.id = rootId
  document.body.appendChild(container)

  ReactDOM.createRoot(container).render(<SidebarApp />)
}
