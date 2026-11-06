import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.jsx'
import { StoreProvider, ToastProvider } from './store.jsx'
import { ConfirmProvider } from './components/ui.jsx'
import { aplicarAparencia, lerAparencia } from './pages/Conta.jsx'
import { dentroDoClaude } from './lib/storage.js'
import Protecao from './components/Protecao.jsx'
import { definirPlataforma, plataforma } from './lib/plataforma.js'
import plataformaDoBuild from '@plataforma'

// Web (navegador/Claude) ou app do iPhone/iPad (build "ios"): define antes de abrir os dados.
definirPlataforma(plataformaDoBuild)
plataforma.iniciar?.()

aplicarAparencia(lerAparencia())

// Instalação como aplicativo (PWA) só quando publicado no seu domínio.
function prepararInstalacao() {
  if (dentroDoClaude() || plataforma.nativo) return
  if (!/^https?:$/.test(location.protocol)) return
  if (window.top !== window.self) return
  const link = document.createElement('link')
  link.rel = 'manifest'
  link.href = 'manifest.webmanifest'
  document.head.appendChild(link)
  const icone = document.createElement('link')
  icone.rel = 'apple-touch-icon'
  icone.href = 'icon-192.png'
  document.head.appendChild(icone)
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {})
    })
  }
}
prepararInstalacao()

createRoot(document.getElementById('root')).render(
  <Protecao>
    <ToastProvider>
      <StoreProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </StoreProvider>
    </ToastProvider>
  </Protecao>,
)
