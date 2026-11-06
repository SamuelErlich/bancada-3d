// App do iPhone/iPad (Capacitor). Só entra no build "ios" (npm run build:ios).
// - Dados em arquivos na pasta Library do app: não somem se o iPhone precisar de espaço e entram no backup do iCloud.
// - PDF, Excel e backup abrem o menu Compartilhar do iOS (Salvar em Arquivos, WhatsApp, AirDrop, e-mail…).
// - jsPDF, SheetJS e as fontes vêm dentro do app: funciona sem internet.
// - A cor do texto da barra de status acompanha o tema do app (claro/escuro).
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { StatusBar, Style } from '@capacitor/status-bar'
import { criarBackendArquivos } from '../lib/arquivosBackend.js'

const PASTA = 'Bancada3D/'

const fs = {
  async ler(caminho) {
    try {
      const r = await Filesystem.readFile({ path: PASTA + caminho, directory: Directory.Library, encoding: Encoding.UTF8 })
      return typeof r.data === 'string' ? r.data : await r.data.text()
    } catch (e) {
      return null
    }
  },
  async gravar(caminho, texto) {
    await Filesystem.writeFile({ path: PASTA + caminho, data: texto, directory: Directory.Library, encoding: Encoding.UTF8, recursive: true })
  },
  async apagar(caminho) {
    await Filesystem.deleteFile({ path: PASTA + caminho, directory: Directory.Library })
  },
  async renomear(de, para) {
    await Filesystem.rename({ from: PASTA + de, to: PASTA + para, directory: Directory.Library, toDirectory: Directory.Library })
  },
}

function blobParaBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(r.error || new Error('Não foi possível preparar o arquivo.'))
    r.readAsDataURL(blob)
  })
}

const nomeSeguro = (nome) => String(nome || 'arquivo').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120)

async function salvarArquivo(nome, blob) {
  const arquivo = await Filesystem.writeFile({
    path: `compartilhar/${Date.now()}/${nomeSeguro(nome)}`,
    data: await blobParaBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  })
  try {
    await Share.share({ title: nome, files: [arquivo.uri] })
    return 'salvo'
  } catch (e) {
    if (/cancel/i.test(String((e && e.message) || e))) return 'recusado'
    throw new Error('Não foi possível abrir o menu de compartilhar.')
  }
}

const SCRIPTS = {
  jspdf: './vendor/jspdf.umd.min.js',
  xlsx: './vendor/xlsx.full.min.js',
}

function temaEscuro() {
  const a = document.documentElement.getAttribute('data-aparencia')
  if (a === 'escuro') return true
  if (a === 'claro') return false
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

function acompanharBarraDeStatus() {
  const aplicar = () => StatusBar.setStyle({ style: temaEscuro() ? Style.Dark : Style.Light }).catch(() => {})
  aplicar()
  new MutationObserver(aplicar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-aparencia'] })
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', aplicar)
}

let backend = null

const ios = Capacitor.isNativePlatform()
  ? {
      nativo: true,
      nome: Capacitor.getPlatform(),
      async armazenamento() {
        if (!backend) {
          backend = criarBackendArquivos(fs)
          const gravarJa = () => backend.descarregarTudo().catch(() => {})
          document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && gravarJa())
          window.addEventListener('pagehide', gravarJa)
          document.addEventListener('pause', gravarJa)
        }
        return backend
      },
      salvarArquivo,
      scriptLocal: (nome) => SCRIPTS[nome] || null,
      iniciar() {
        document.documentElement.classList.add('app-nativo')
        acompanharBarraDeStatus()
      },
    }
  : // Build do iOS aberto num navegador (teste): usa as bibliotecas locais e o resto igual à web.
    { scriptLocal: (nome) => SCRIPTS[nome] || null }

export default ios
