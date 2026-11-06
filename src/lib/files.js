// Arquivos: baixar, compartilhar, carregar bibliotecas sob demanda e comprimir imagens.
import { dentroDoClaude } from './storage.js'
import { plataforma } from './plataforma.js'

const scripts = new Map()

export function carregarScript(url, global) {
  if (global && window[global]) return Promise.resolve(window[global])
  if (scripts.has(url)) return scripts.get(url)
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = url
    s.async = true
    s.onload = () => resolve(global ? window[global] : true)
    s.onerror = () => {
      scripts.delete(url)
      reject(new Error('Não foi possível carregar um componente. Confira sua conexão e tente de novo.'))
    }
    document.head.appendChild(s)
  })
  scripts.set(url, p)
  return p
}

// No app do iPhone/iPad as bibliotecas vêm dentro do app (funciona sem internet).
const local = (nome, url) => plataforma.scriptLocal?.(nome) || url

export async function carregarJsPDF() {
  const mod = await carregarScript(local('jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'), 'jspdf')
  return (mod || window.jspdf).jsPDF
}

export async function carregarXLSX() {
  return carregarScript(local('xlsx', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'), 'XLSX')
}

/**
 * Entrega um arquivo ao usuário.
 * Dentro do Claude usa a confirmação de download da plataforma; fora dele, download normal.
 * Retorna 'salvo' | 'recusado' | 'indisponivel'.
 */
export async function baixarArquivo(nome, dados, tipo = 'application/octet-stream') {
  const blob = dados instanceof Blob ? dados : new Blob([dados], { type: tipo })
  // App do iPhone/iPad: menu Compartilhar do iOS (Salvar em Arquivos, WhatsApp, AirDrop, e-mail…)
  if (plataforma.salvarArquivo) return plataforma.salvarArquivo(nome, blob)
  if (dentroDoClaude()) {
    try {
      const downloads = await window.claude.use('downloads')
      if (downloads) {
        await downloads.save({ filename: nome, data: blob })
        return 'salvo'
      }
    } catch (e) {
      if (e && e.code === 'declined') return 'recusado'
      if (e && (e.code === 'rate_limited' || e.code === 'too_large' || e.code === 'rejected_extension')) throw new Error(e.message || 'Não foi possível salvar o arquivo.')
    }
  }
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return 'salvo'
  } catch (e) {
    return 'indisponivel'
  }
}

/** No celular abre o menu de compartilhar (WhatsApp, e-mail…); no computador baixa o arquivo. */
export async function compartilharOuBaixar(nome, blob, titulo) {
  if (plataforma.salvarArquivo) {
    const r = await plataforma.salvarArquivo(nome, blob)
    return r === 'recusado' ? 'cancelado' : 'compartilhado'
  }
  if (!dentroDoClaude() && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const arquivo = new File([blob], nome, { type: blob.type || 'application/pdf' })
      if (navigator.canShare({ files: [arquivo] }) && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)) {
        await navigator.share({ files: [arquivo], title: titulo || nome })
        return 'compartilhado'
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelado'
    }
  }
  return baixarArquivo(nome, blob)
}

export function lerArquivoComoDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error || new Error('Não foi possível ler o arquivo.'))
    r.readAsDataURL(file)
  })
}

export function lerArquivoComoTexto(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || ''))
    r.onerror = () => reject(r.error || new Error('Não foi possível ler o arquivo.'))
    r.readAsText(file)
  })
}

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível abrir esta imagem. Use JPG, PNG ou WebP.'))
    img.src = src
  })
}

/**
 * Reduz a imagem para caber no armazenamento (lado maior e tamanho máximo do texto base64).
 * Mantém PNG quando a imagem tem transparência e cabe; senão usa JPEG.
 */
export async function comprimirImagem(src, { ladoMax = 1100, limite = 240000, manterTransparencia = false } = {}) {
  const img = await carregarImagem(src)
  let lado = ladoMax
  for (let tentativa = 0; tentativa < 8; tentativa++) {
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * escala))
    const h = Math.max(1, Math.round(img.naturalHeight * escala))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (manterTransparencia) {
      ctx.drawImage(img, 0, 0, w, h)
      const png = canvas.toDataURL('image/png')
      if (png.length <= limite) return { dataUrl: png, largura: w, altura: h }
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
    }
    for (const q of [0.86, 0.78, 0.7, 0.6]) {
      const jpg = canvas.toDataURL('image/jpeg', q)
      if (jpg.length <= limite) return { dataUrl: jpg, largura: w, altura: h }
    }
    lado = Math.round(lado * 0.75)
  }
  throw new Error('A imagem é grande demais mesmo depois de reduzida.')
}

export function dataUrlParaBlob(dataUrl) {
  const [cab, dados] = dataUrl.split(',')
  const mime = (cab.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream'
  const bin = atob(dados)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch (e) {
    // Plano B (app do iPhone e navegadores sem a API de área de transferência)
    try {
      const t = document.createElement('textarea')
      t.value = texto
      t.setAttribute('readonly', '')
      t.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'
      document.body.appendChild(t)
      t.select()
      t.setSelectionRange(0, texto.length)
      const ok = document.execCommand('copy')
      t.remove()
      return ok
    } catch (e2) {
      return false
    }
  }
}
