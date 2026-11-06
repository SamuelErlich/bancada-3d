// Formatação no padrão brasileiro e utilidades gerais.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function fmtBRL(v) {
  return Number.isFinite(v) ? brl.format(v) : '—'
}

export function fmtPct(v, casas = 1) {
  if (!Number.isFinite(v)) return '—'
  return (
    (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas }) + '%'
  )
}

export function fmtNum(v, casas = 2) {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })
}

export function fmtMarkup(v) {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '×'
}

/** Aceita "1.234,56", "1234.56", "12,5" e números. Vazio → NaN. */
export function parseNum(s) {
  if (typeof s === 'number') return s
  let t = String(s ?? '').trim().replace(/\s/g, '').replace(/^R\$/i, '')
  if (t === '') return NaN
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

/** Número para edição em campo de texto (vírgula decimal, sem milhar). */
export function numToInput(v, casas = 4) {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return ''
  const n = Number(v)
  const s = Number(n.toFixed(casas)).toString()
  return s.replace('.', ',')
}

export function n0(v) {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100
}

const pad = (x) => String(x).padStart(2, '0')

export function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function isoDe(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function dataDeISO(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function fmtData(iso) {
  const d = dataDeISO(iso)
  if (!d) return '—'
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function fmtDataCurta(iso) {
  const d = dataDeISO(iso)
  if (!d) return '—'
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}

export function fmtDataHora(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function addDias(iso, dias) {
  const d = dataDeISO(iso) || new Date()
  d.setDate(d.getDate() + dias)
  return isoDe(d)
}

/** Soma dias úteis (seg–sex). */
export function addDiasUteis(iso, dias) {
  const d = dataDeISO(iso) || new Date()
  let restantes = Math.max(0, Math.floor(dias))
  while (restantes > 0) {
    d.setDate(d.getDate() + 1)
    const w = d.getDay()
    if (w !== 0 && w !== 6) restantes--
  }
  return isoDe(d)
}

export function diffDias(isoA, isoB) {
  const a = dataDeISO(isoA)
  const b = dataDeISO(isoB)
  if (!a || !b) return 0
  return Math.round((a - b) / 86400000)
}

export function soDigitos(s) {
  return String(s ?? '').replace(/\D/g, '')
}

export function fmtTelefone(s) {
  let d = soDigitos(s)
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return s || ''
}

/** Número no formato que o wa.me entende (55 + DDD + número). Vazio se inválido. */
export function numeroWhats(s) {
  let d = soDigitos(s)
  if (d.length === 10 || d.length === 11) d = '55' + d
  if (d.length < 12 || d.length > 13) return ''
  return d
}

export function linkWhats(numero, texto) {
  const n = numeroWhats(numero)
  const t = encodeURIComponent(texto || '')
  return n ? `https://wa.me/${n}?text=${t}` : `https://wa.me/?text=${t}`
}

export function novoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 12)
}

export function normalizar(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function contem(texto, busca) {
  if (!busca) return true
  return normalizar(texto).includes(normalizar(busca))
}

export function fmtHoras(h) {
  if (!Number.isFinite(h) || h <= 0) return '0 min'
  const total = Math.round(h * 60)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  if (!hh) return `${mm} min`
  if (!mm) return `${hh} h`
  return `${hh} h ${mm} min`
}

export function numeroDoc(n, casas = 4) {
  return String(Math.max(0, Math.floor(n || 0))).padStart(casas, '0')
}

export function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`
}

export function nomeArquivo(s) {
  return (
    normalizar(s)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'arquivo'
  )
}
