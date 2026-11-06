// Planilhas do Excel (.xlsx): abas com moeda, datas e números de verdade (somam, filtram e viram tabela
// dinâmica), filtro nos títulos e totais que respeitam o filtro. Também lê .xlsx, .xls, .ods e .csv enviados.
import { carregarXLSX } from './files.js'

export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Códigos de formato do Excel (o Excel mostra no padrão do computador: R$ 1.234,56 e 06/11/2026).
const FORMATO = {
  moeda: '"R$" #,##0.00;-"R$" #,##0.00',
  numero: '#,##0.00',
  inteiro: '#,##0',
  pct: '0.0%',
  data: 'dd/mm/yyyy',
  datahora: 'dd/mm/yyyy hh:mm',
  mes: 'mmm/yyyy',
}
const NUMERICOS = new Set(['moeda', 'numero', 'inteiro', 'pct', 'decimal', 'data', 'datahora', 'mes'])
const EPOCA = Date.UTC(1899, 11, 30)

/** Número de série do Excel para uma data ISO (AAAA-MM-DD) ou um timestamp, sem desvio de fuso. */
export function serialData(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return null
    const d = new Date(valor)
    return (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) - EPOCA) / 86400000
  }
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(valor))
  if (!m) return null
  return (Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1) - EPOCA) / 86400000
}

function valorCelula(v, tipo) {
  if (v === null || v === undefined || v === '') return null
  if (tipo === 'data' || tipo === 'datahora' || tipo === 'mes') return serialData(v)
  if (NUMERICOS.has(tipo)) {
    const n = typeof v === 'number' ? v : Number(v)
    if (!Number.isFinite(n)) return null
    return tipo === 'moeda' ? Math.round(n * 100) / 100 : n
  }
  return typeof v === 'string' ? v : String(v)
}

function larguraTexto(v, tipo) {
  if (v === null || v === undefined) return 0
  if (tipo === 'moeda') return 15
  if (tipo === 'data' || tipo === 'mes') return 11
  if (tipo === 'datahora') return 16
  if (typeof v === 'number') return Math.min(14, String(Math.round(v * 100) / 100).length + 3)
  return Math.max(...String(v).split('\n').map((l) => l.length)) + 1
}

/**
 * Monta uma aba.
 * colunas: [{ titulo, tipo?: 'texto'|'moeda'|'numero'|'decimal'|'inteiro'|'pct'|'data'|'datahora'|'mes', largura? }]
 * linhas: arrays na ordem das colunas (datas em ISO ou timestamp; pct em fração: 0,25 = 25%).
 * antes / depois: linhas soltas acima e abaixo da tabela; cada item é um valor ou { v, tipo }.
 * total: índices das colunas somadas numa linha "Total" (SUBTOTAL: respeita o filtro do Excel).
 */
export function montarAba(XLSX, { colunas, linhas = [], antes = [], depois = [], filtro = true, total = null }) {
  const aoa = []
  const formatos = []
  const tipos = []
  const solta = (lista) => {
    const r = aoa.length
    tipos[r] = []
    aoa.push(
      (lista || []).map((x, c) => {
        if (x && typeof x === 'object' && 'v' in x) {
          const val = valorCelula(x.v, x.tipo)
          if (FORMATO[x.tipo] && val !== null) formatos.push([r, c, FORMATO[x.tipo]])
          tipos[r][c] = x.tipo
          return val
        }
        return x === undefined ? null : x
      }),
    )
  }
  antes.forEach(solta)
  const cab = aoa.length
  aoa.push(colunas.map((c) => c.titulo))
  for (const l of linhas) {
    const r = aoa.length
    tipos[r] = colunas.map((c) => c.tipo)
    aoa.push(
      colunas.map((c, i) => {
        const val = valorCelula(l[i], c.tipo)
        if (FORMATO[c.tipo] && val !== null) formatos.push([r, i, FORMATO[c.tipo]])
        return val
      }),
    )
  }
  const fim = aoa.length - 1
  let linhaTotal = -1
  if (total && total.length && linhas.length) {
    aoa.push([])
    linhaTotal = aoa.length
    tipos[linhaTotal] = colunas.map((c) => c.tipo)
    aoa.push(colunas.map((c, i) => (i === 0 ? 'Total' : null)))
  }
  if (depois.length) {
    aoa.push([])
    depois.forEach(solta)
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  for (const [r, c, z] of formatos) {
    const cel = ws[XLSX.utils.encode_cell({ r, c })]
    if (cel && cel.t === 'n') cel.z = z
  }
  if (linhaTotal >= 0) {
    for (const i of total) {
      const col = XLSX.utils.encode_col(i)
      let soma = 0
      for (const l of linhas) {
        const v = valorCelula(l[i], colunas[i].tipo)
        if (typeof v === 'number') soma += v
      }
      const cel = { t: 'n', v: Math.round(soma * 100) / 100, f: `SUBTOTAL(9,${col}${cab + 2}:${col}${fim + 1})` }
      if (FORMATO[colunas[i].tipo]) cel.z = FORMATO[colunas[i].tipo]
      ws[XLSX.utils.encode_cell({ r: linhaTotal, c: i })] = cel
    }
    const rg = XLSX.utils.decode_range(ws['!ref'])
    rg.e.r = Math.max(rg.e.r, linhaTotal)
    rg.e.c = Math.max(rg.e.c, colunas.length - 1)
    ws['!ref'] = XLSX.utils.encode_range(rg)
  }
  if (filtro && linhas.length) {
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: cab, c: 0 }, e: { r: fim, c: colunas.length - 1 } }) }
  }
  const nCols = Math.max(colunas.length, ...aoa.map((l) => l.length))
  const cols = []
  for (let c = 0; c < nCols; c++) {
    if (colunas[c]?.largura) {
      cols.push({ wch: colunas[c].largura })
      continue
    }
    let w = colunas[c] ? String(colunas[c].titulo).length + 2 : 8
    aoa.forEach((l, r) => {
      if (r === cab) return
      // textos soltos longos (título da aba, notas) transbordam para o lado e não alargam a coluna
      const t = larguraTexto(l[c], tipos[r]?.[c])
      w = Math.max(w, r < cab || r > fim ? Math.min(t, 46) : t)
    })
    cols.push({ wch: Math.min(60, Math.max(8, w)) })
  }
  ws['!cols'] = cols
  return ws
}

function nomeDeAba(nome, usados) {
  let base = String(nome || 'Aba').replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Aba'
  let n = base
  let i = 2
  while (usados.includes(n)) n = `${base.slice(0, 28)} ${i++}`
  return n
}

/** Cria um livro do Excel: livro.aba(nome, config) e depois livro.blob(). */
export async function novoLivro(titulo) {
  const XLSX = await carregarXLSX()
  const wb = XLSX.utils.book_new()
  wb.Props = { Title: titulo || 'Bancada 3D', Author: 'Bancada 3D', CreatedDate: new Date() }
  return {
    XLSX,
    aba(nome, cfg) {
      XLSX.utils.book_append_sheet(wb, montarAba(XLSX, cfg), nomeDeAba(nome, wb.SheetNames))
    },
    blob() {
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true })
      return new Blob([buf], { type: MIME_XLSX })
    },
  }
}

// ---------- Leitura ----------

function textoDoCSV(buf) {
  let t
  try {
    t = new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch (e) {
    t = new TextDecoder('windows-1252').decode(buf) // "CSV (separado por vírgulas)" do Excel no Windows
  }
  return t.replace(/^﻿/, '')
}

/**
 * Lê .xlsx, .xls, .xlsm, .ods ou .csv e devolve [{ nome, linhas: [[...], ...] }].
 * Células numéricas chegam como número; textos como texto (o CSV chega todo como texto, para não
 * confundir a vírgula decimal com separador de milhar).
 */
export async function lerPlanilha(file) {
  const XLSX = await carregarXLSX()
  const buf = await file.arrayBuffer()
  const nome = String(file.name || '').toLowerCase()
  let wb
  try {
    if (nome.endsWith('.csv') || nome.endsWith('.txt') || file.type === 'text/csv') {
      wb = XLSX.read(textoDoCSV(buf), { type: 'string', raw: true })
    } else {
      wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
    }
  } catch (e) {
    throw new Error('Não consegui ler esse arquivo. Salve no Excel como .xlsx ou .csv e tente de novo.')
  }
  return wb.SheetNames.map((n) => ({
    nome: n,
    linhas: XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null, blankrows: false }),
  }))
}
