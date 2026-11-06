// Materiais e estoque: exportar para o Excel, tabela modelo e importar de planilha (.xlsx, .xls, .ods ou .csv).
import { novoLivro } from './excel.js'
import { custoGramaFilamento, custoLitroResina, precoUnidadeInsumo } from './pricing.js'
import { TIPOS_FILAMENTO, TIPOS_RESINA, UNIDADES_INSUMO } from './defaults.js'
import { hojeISO, n0, normalizar, novoId } from './format.js'

export const TIPOS_MATERIAL = ['filamentos', 'resinas', 'insumos']

export const INFO_MATERIAL = {
  filamentos: { rotulo: 'Filamentos', um: 'filamento', estoque: 'carretéis' },
  resinas: { rotulo: 'Resinas', um: 'resina', estoque: 'frascos' },
  insumos: { rotulo: 'Insumos', um: 'insumo', estoque: '' },
}

const PADRAO = {
  filamentos: () => ({ nome: '', tipo: 'PLA', marca: '', cor: '#3a3f44', fornecedor: '', custoCarretel: null, pesoCarretelG: 1000, estoque: null }),
  resinas: () => ({ nome: '', tipo: 'Standard', marca: '', cor: '#9aa0a4', fornecedor: '', custoFrasco: null, volumeFrascoMl: 1000, estoque: null }),
  insumos: () => ({ nome: '', unidade: 'un', precoEmbalagem: null, qtdEmbalagem: 1, estoque: null }),
}

/** Quanto dinheiro está parado no estoque desse material. */
export function valorEstoque(tipo, m) {
  const q = Number(m?.estoque)
  if (!Number.isFinite(q) || q <= 0) return 0
  if (tipo === 'filamentos') return q * n0(m.custoCarretel)
  if (tipo === 'resinas') return q * n0(m.custoFrasco)
  return q * precoUnidadeInsumo(m)
}

export function resumoEstoque(dados) {
  const r = { itens: 0, valor: 0, carreteis: 0, frascos: 0, comEstoque: 0 }
  for (const tipo of TIPOS_MATERIAL) {
    for (const m of Object.values(dados[tipo] || {})) {
      r.itens += 1
      r.valor += valorEstoque(tipo, m)
      const q = Number(m.estoque)
      if (Number.isFinite(q)) {
        r.comEstoque += 1
        if (tipo === 'filamentos') r.carreteis += q
        if (tipo === 'resinas') r.frascos += q
      }
    }
  }
  return r
}

// ---------- Colunas (as mesmas na exportação, na tabela modelo e na importação) ----------

const COLUNAS = {
  filamentos: [
    { campo: 'nome', titulo: 'Nome', largura: 28 },
    { campo: 'tipo', titulo: 'Tipo', largura: 12 },
    { campo: 'marca', titulo: 'Marca', largura: 16 },
    { campo: 'fornecedor', titulo: 'Fornecedor', largura: 18 },
    { campo: 'cor', titulo: 'Cor', largura: 11 },
    { campo: 'custoCarretel', titulo: 'Preço do carretel (R$)', tipo: 'moeda' },
    { campo: 'pesoCarretelG', titulo: 'Peso do carretel (g)', tipo: 'inteiro' },
    { campo: 'estoque', titulo: 'Em estoque (carretéis)', tipo: 'decimal' },
  ],
  resinas: [
    { campo: 'nome', titulo: 'Nome', largura: 28 },
    { campo: 'tipo', titulo: 'Tipo', largura: 18 },
    { campo: 'marca', titulo: 'Marca', largura: 16 },
    { campo: 'fornecedor', titulo: 'Fornecedor', largura: 18 },
    { campo: 'cor', titulo: 'Cor', largura: 11 },
    { campo: 'custoFrasco', titulo: 'Preço do frasco (R$)', tipo: 'moeda' },
    { campo: 'volumeFrascoMl', titulo: 'Volume do frasco (ml)', tipo: 'inteiro' },
    { campo: 'estoque', titulo: 'Em estoque (frascos)', tipo: 'decimal' },
  ],
  insumos: [
    { campo: 'nome', titulo: 'Nome', largura: 30 },
    { campo: 'unidade', titulo: 'Unidade', largura: 10 },
    { campo: 'precoEmbalagem', titulo: 'Preço pago (R$)', tipo: 'moeda' },
    { campo: 'qtdEmbalagem', titulo: 'Quantidade no pacote', tipo: 'decimal' },
    { campo: 'estoque', titulo: 'Em estoque', tipo: 'decimal' },
  ],
}

const CALCULADAS = {
  filamentos: [
    { titulo: 'Custo por kg (R$)', tipo: 'moeda', valor: (m) => custoGramaFilamento(m) * 1000 },
    { titulo: 'Valor em estoque (R$)', tipo: 'moeda', valor: (m) => valorEstoque('filamentos', m) },
  ],
  resinas: [
    { titulo: 'Custo por litro (R$)', tipo: 'moeda', valor: (m) => custoLitroResina(m) },
    { titulo: 'Valor em estoque (R$)', tipo: 'moeda', valor: (m) => valorEstoque('resinas', m) },
  ],
  insumos: [
    { titulo: 'Custo por unidade (R$)', tipo: 'moeda', valor: (m) => precoUnidadeInsumo(m) },
    { titulo: 'Valor em estoque (R$)', tipo: 'moeda', valor: (m) => valorEstoque('insumos', m) },
  ],
}

const CODIGO = { titulo: 'Código do app (não altere)', largura: 26 }

const porNome = (a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')

const INSTRUCOES = [
  'Uma linha por material. Pode copiar e colar da sua planilha, mantendo os títulos das colunas.',
  'Linhas que começam com "Exemplo" são ignoradas: apague ou escreva por cima.',
  'Para cadastrar um material novo, preencha pelo menos Nome e Preço. Peso ou volume em branco = 1.000 g / 1.000 ml; quantidade no pacote em branco = 1.',
  'Para atualizar o que já existe, use o mesmo nome (ou o Código do app, que vem na exportação). Só as colunas preenchidas mudam.',
  'Para só atualizar o estoque: deixe as colunas Nome e Em estoque (as outras podem ficar vazias).',
  'Números: pode usar vírgula (109,90) ou ponto. "1 kg" vira 1.000 g e "1 L" vira 1.000 ml.',
  'Cor: código (#1a1a1a) ou nome (preto, branco, cinza, prata, vermelho, azul, verde, amarelo, laranja, rosa, roxo, marrom, bege, dourado, transparente).',
  `Tipos de filamento: ${TIPOS_FILAMENTO.map((t) => t.tipo).join(', ')}. Outro nome vira "Outro".`,
  `Tipos de resina: ${TIPOS_RESINA.join(', ')}.`,
  `Unidades de insumo: ${UNIDADES_INSUMO.map((u) => `${u.valor} (${u.rotulo})`).join(', ')}. Em estoque do insumo vai nessa unidade.`,
  'No app: Planilhas → Importar planilha (ou Meu QG → Importar planilha). O app mostra tudo antes de salvar.',
]

/** Planilha com tudo o que está cadastrado: filamentos, resinas, insumos e o valor em estoque. */
export async function xlsxMateriais(dados) {
  const livro = await novoLivro('Materiais e estoque')
  const resumo = []
  for (const tipo of TIPOS_MATERIAL) {
    const lista = Object.values(dados[tipo] || {}).sort(porNome)
    livro.aba(INFO_MATERIAL[tipo].rotulo, {
      colunas: [...COLUNAS[tipo], ...CALCULADAS[tipo].map(({ titulo, tipo: t }) => ({ titulo, tipo: t })), CODIGO],
      linhas: lista.map((m) => [...COLUNAS[tipo].map((c) => (m[c.campo] === undefined ? null : m[c.campo])), ...CALCULADAS[tipo].map((c) => c.valor(m)), m.id]),
      total: [COLUNAS[tipo].length + 1],
    })
    resumo.push([INFO_MATERIAL[tipo].rotulo, lista.length, lista.reduce((s, m) => s + valorEstoque(tipo, m), 0)])
  }
  const negocio = dados.config?.negocio?.nome?.trim()
  livro.aba('Resumo', {
    antes: [[`Materiais e estoque${negocio ? ` — ${negocio}` : ''}`], ['Gerado em', { v: Date.now(), tipo: 'datahora' }], []],
    colunas: [{ titulo: 'Material', largura: 22 }, { titulo: 'Itens cadastrados', tipo: 'inteiro' }, { titulo: 'Valor em estoque (R$)', tipo: 'moeda' }],
    linhas: resumo,
    total: [1, 2],
    filtro: false,
  })
  livro.aba('Como importar', { colunas: [{ titulo: 'Como atualizar pelo Excel', largura: 120 }], linhas: INSTRUCOES.map((t) => [t]), filtro: false })
  return livro.blob()
}

const EXEMPLOS = {
  filamentos: [
    ['Exemplo: PLA Preto', 'PLA', 'Marca A', 'Loja B', 'preto', 109.9, 1000, 3],
    ['Exemplo: PETG Branco', 'PETG', 'Marca A', '', '#f4f4f0', 119.9, 1000, 1.5],
  ],
  resinas: [['Exemplo: Resina Standard Cinza', 'Standard', 'Marca A', '', 'cinza', 179.9, 1000, 2]],
  insumos: [
    ['Exemplo: Caixa 15×15×10', 'un', 45, 25, 60],
    ['Exemplo: Ímã 10×2 mm', 'un', 30, 50, 120],
  ],
}

/** Tabela modelo para preencher no Excel e importar. */
export async function xlsxModeloMateriais() {
  const livro = await novoLivro('Tabela modelo de materiais')
  for (const tipo of TIPOS_MATERIAL) {
    livro.aba(INFO_MATERIAL[tipo].rotulo, { colunas: [...COLUNAS[tipo], CODIGO], linhas: EXEMPLOS[tipo].map((l) => [...l, null]) })
  }
  livro.aba('Como preencher', { colunas: [{ titulo: 'Como preencher', largura: 120 }], linhas: INSTRUCOES.map((t) => [t]), filtro: false })
  return livro.blob()
}

export const nomeArquivoMateriais = () => `materiais-e-estoque-${hojeISO()}.xlsx`
export const NOME_MODELO = 'tabela-modelo-materiais.xlsx'

// ---------- Importação ----------

const ROTULO_CAMPO = {
  nome: 'Nome',
  tipo: 'Tipo',
  marca: 'Marca',
  fornecedor: 'Fornecedor',
  cor: 'Cor',
  custoCarretel: 'Preço',
  pesoCarretelG: 'Peso',
  custoFrasco: 'Preço',
  volumeFrascoMl: 'Volume',
  precoEmbalagem: 'Preço',
  qtdEmbalagem: 'Qtd. no pacote',
  unidade: 'Unidade',
  estoque: 'Em estoque',
  codigo: 'Código',
}
export const rotuloCampo = (c) => ROTULO_CAMPO[c] || c

const CAMPOS_NUMERICOS = new Set(['custoCarretel', 'pesoCarretelG', 'custoFrasco', 'volumeFrascoMl', 'precoEmbalagem', 'qtdEmbalagem', 'estoque'])
const CAMPOS_MOEDA = new Set(['custoCarretel', 'custoFrasco', 'precoEmbalagem'])

function baseTitulo(t) {
  return normalizar(t)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function unidadeTitulo(t) {
  const n = normalizar(t)
  if (/\bkg\b|quilo/.test(n)) return 'kg'
  if (/\bml\b|mililitro/.test(n)) return 'ml'
  if (/\(l\)|\blitros?\b/.test(n)) return 'l'
  if (/\(g\)|\bgramas?\b/.test(n)) return 'g'
  return ''
}

const ignorar = (b) => ` ${b} `.includes(' por ') || /^(valor (em|do|total)|valor estoque|total|em calculos|situacao|status)/.test(b)
const ehPreco = (b) => /^(preco|valor|custo)\b/.test(b)
const REGRAS_COMUNS = [
  ['codigo', (b) => b.startsWith('codigo') || b === 'id' || b === 'cod'],
  ['_ignorar', ignorar],
  ['nome', (b) => ['nome', 'material', 'filamento', 'resina', 'insumo', 'descricao', 'produto', 'item'].includes(b) || b.startsWith('nome')],
  ['marca', (b) => b === 'marca' || b === 'fabricante'],
  ['fornecedor', (b) => b.startsWith('fornecedor') || b === 'loja'],
]
const REGRAS = {
  filamentos: [
    ...REGRAS_COMUNS,
    ['estoque', (b) => b.includes('estoque') || ['carreteis', 'carretel', 'rolos', 'quantidade', 'qtd', 'qtde', 'quant', 'saldo'].includes(b)],
    ['pesoCarretelG', (b) => b.startsWith('peso') || ['gramas', 'g', 'kg'].includes(b)],
    ['custoCarretel', ehPreco],
    ['tipo', (b) => b.startsWith('tipo') || b === 'categoria'],
    ['cor', (b) => b === 'cor' || b.startsWith('cor ')],
  ],
  resinas: [
    ...REGRAS_COMUNS,
    ['estoque', (b) => b.includes('estoque') || ['frascos', 'frasco', 'quantidade', 'qtd', 'qtde', 'quant', 'saldo'].includes(b)],
    ['volumeFrascoMl', (b) => b.startsWith('volume') || ['ml', 'litros', 'litro', 'l', 'conteudo'].includes(b)],
    ['custoFrasco', ehPreco],
    ['tipo', (b) => b.startsWith('tipo') || b === 'categoria'],
    ['cor', (b) => b === 'cor' || b.startsWith('cor ')],
  ],
  insumos: [
    ...REGRAS_COMUNS,
    ['qtdEmbalagem', (b) => b === 'rendimento' || (/(quantidade|qtd|qtde|quant|unidades)/.test(b) && /(pacote|embalagem|caixa|rolo|frasco|kit)/.test(b))],
    ['estoque', (b) => b.includes('estoque') || ['quantidade', 'qtd', 'qtde', 'quant', 'saldo'].includes(b)],
    ['precoEmbalagem', ehPreco],
    ['unidade', (b) => b.startsWith('unidade') || b === 'un' || b === 'medida'],
  ],
}

/** Para cada coluna, o campo do app que ela preenche (ou null). Cada campo é usado uma vez só. */
export function mapearColunas(titulos, tipo) {
  const usados = new Set()
  return titulos.map((t) => {
    const b = baseTitulo(t)
    if (!b) return null
    for (const [campo, teste] of REGRAS[tipo]) {
      if (!teste(b)) continue
      if (campo === '_ignorar') return null
      if (usados.has(campo)) return null
      usados.add(campo)
      return campo
    }
    return null
  })
}

function tipoPelaAba(nome) {
  const n = normalizar(nome)
  if (/filament/.test(n)) return 'filamentos'
  if (/resina/.test(n)) return 'resinas'
  if (/insumo|embalage|acessori/.test(n)) return 'insumos'
  return null
}

const abaDeAjuda = (nome) => /resumo|como (preencher|importar|usar)|instruc|leia|^listas?$|ajuda/.test(normalizar(nome))

function tipoPelasColunas(titulos) {
  const tem = (tipo, campo) => mapearColunas(titulos, tipo).includes(campo)
  if (tem('filamentos', 'pesoCarretelG')) return 'filamentos'
  if (tem('resinas', 'volumeFrascoMl')) return 'resinas'
  if (tem('insumos', 'qtdEmbalagem') || tem('insumos', 'unidade')) return 'insumos'
  return null
}

function acharCabecalho(linhas) {
  for (let r = 0; r < Math.min(15, linhas.length); r++) {
    const titulos = (linhas[r] || []).map((c) => (c === null || c === undefined ? '' : String(c)))
    if (titulos.filter((t) => t.trim()).length < 2) continue
    const mapa = mapearColunas(titulos, 'filamentos')
    if (mapa.includes('nome') || mapa.includes('codigo')) return { r, titulos }
  }
  return null
}

/** Lê "R$ 1.234,56", "149,90", "1.5", "1 kg", "750 g", "1L"… → { valor, unidade } (null se vazio). */
export function lerNumero(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? { valor: v, unidade: '' } : { valor: NaN, unidade: '' }
  if (typeof v === 'boolean') return { valor: NaN, unidade: '' }
  let t = String(v).trim()
  if (!t || t === '-' || t === '—') return null
  t = t.replace(/^r\$\s*/i, '').replace(/\s+/g, '')
  const m = /^(-?[\d.,]+)([a-zA-Zçãéí%]*)\.?$/.exec(t)
  if (!m) return { valor: NaN, unidade: '' }
  let num = m[1]
  const virgula = num.includes(',')
  const ponto = num.includes('.')
  if (virgula && ponto) {
    num = num.lastIndexOf(',') > num.lastIndexOf('.') ? num.replace(/\./g, '').replace(',', '.') : num.replace(/,/g, '')
  } else if (virgula) {
    num = /^-?\d{1,3}(,\d{3}){2,}$/.test(num) ? num.replace(/,/g, '') : num.replace(',', '.')
  } else if (ponto && /^-?\d{1,3}(\.\d{3})+$/.test(num)) {
    num = num.replace(/\./g, '') // 1.000 = mil
  }
  const valor = Number(num)
  return { valor: Number.isFinite(valor) ? valor : NaN, unidade: normalizar(m[2]) }
}

const CORES = [
  ['verde agua', '#7fd1c3'],
  ['azul claro', '#6fa8dc'],
  ['azul escuro', '#1d3b6e'],
  ['verde escuro', '#1f5130'],
  ['cinza escuro', '#4a5054'],
  ['cinza claro', '#c3c8cb'],
  ['transparente', '#e8eef0'],
  ['translucido', '#e8eef0'],
  ['natural', '#efe9dc'],
  ['preto', '#1f1f1f'],
  ['black', '#1f1f1f'],
  ['branco', '#f4f4f0'],
  ['white', '#f4f4f0'],
  ['cinza', '#8a9196'],
  ['grafite', '#4a5054'],
  ['gray', '#8a9196'],
  ['grey', '#8a9196'],
  ['prata', '#c0c4c8'],
  ['silver', '#c0c4c8'],
  ['vermelho', '#c62828'],
  ['red', '#c62828'],
  ['vinho', '#7b1f2b'],
  ['azul', '#1e5bb8'],
  ['blue', '#1e5bb8'],
  ['verde', '#2e7d32'],
  ['green', '#2e7d32'],
  ['amarelo', '#f2c11d'],
  ['yellow', '#f2c11d'],
  ['laranja', '#e8730c'],
  ['orange', '#e8730c'],
  ['rosa', '#e78fb3'],
  ['pink', '#e78fb3'],
  ['roxo', '#7b3fa0'],
  ['lilas', '#b39ddb'],
  ['purple', '#7b3fa0'],
  ['marrom', '#6d4c41'],
  ['brown', '#6d4c41'],
  ['bege', '#d9c7a7'],
  ['dourado', '#c9a227'],
  ['ouro', '#c9a227'],
  ['gold', '#c9a227'],
  ['cobre', '#b87333'],
  ['bronze', '#a97142'],
]

export function corDe(v, procurarNoTexto = false) {
  const t = String(v ?? '').trim()
  if (!t) return null
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(t)
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1]
    return `#${h.toLowerCase()}`
  }
  const n = ` ${normalizar(t).replace(/[^a-z0-9]+/g, ' ')} `
  for (const [nome, cor] of CORES) if ((procurarNoTexto ? n.includes(` ${nome} `) : n.trim() === nome) || n.trim().startsWith(nome + ' ')) return cor
  return null
}

const semEspaco = (s) => normalizar(s).replace(/[\s_-]+/g, '')

const SINONIMOS_RESINA = [
  [/lavav|water|agua/, 'Lavável em água'],
  [/abs/, 'ABS-like'],
  [/8k|precis/, 'Alta precisão (8K)'],
  [/flex/, 'Flexível'],
  [/transl|transp|clear|crystal|cristal/, 'Translúcida'],
  [/standard|padrao|comum|basica/, 'Standard'],
]

function tipoCanonico(tipo, bruto) {
  const s = semEspaco(bruto)
  if (tipo === 'filamentos') return TIPOS_FILAMENTO.find((t) => semEspaco(t.tipo) === s)?.tipo || 'Outro'
  const exato = TIPOS_RESINA.find((t) => semEspaco(t) === s)
  if (exato) return exato
  return SINONIMOS_RESINA.find(([re]) => re.test(s))?.[1] || 'Outra'
}

function tipoPeloNome(nome) {
  const n = ` ${normalizar(nome).replace(/[^a-z0-9+]+/g, ' ')} `
  const lista = [...TIPOS_FILAMENTO.filter((t) => t.tipo !== 'Outro')].sort((a, b) => b.tipo.length - a.tipo.length)
  return lista.find((t) => n.includes(` ${normalizar(t.tipo).replace(/[^a-z0-9+]+/g, ' ')} `))?.tipo || null
}

const UNIDADES = [
  [/^(un|und|unid|unidade|unidades|pc|pcs|peca|pecas|u)$/, 'un'],
  [/^(par|pares)$/, 'par'],
  [/^(m|metro|metros|mt|mts)$/, 'm'],
  [/^(cm|centimetro|centimetros)$/, 'cm'],
  [/^(g|gr|grama|gramas)$/, 'g'],
  [/^(ml|mililitro|mililitros)$/, 'ml'],
  [/^(folha|folhas|fl)$/, 'folha'],
  [/^(kit|kits)$/, 'kit'],
]

function unidadeCanonica(bruto) {
  const s = normalizar(bruto).replace(/[^a-z]/g, '')
  return UNIDADES.find(([re]) => re.test(s))?.[1] || null
}

const nomeChave = (s) => normalizar(s).replace(/\s+/g, ' ')
const idValido = (s) => /^[A-Za-z0-9_-]{4,64}$/.test(String(s || ''))

function lerLinha(row, mapa, unidades, tipo) {
  const campos = {}
  const erros = []
  const avisos = []
  mapa.forEach((campo, i) => {
    if (!campo) return
    const bruto = row[i]
    if (bruto === null || bruto === undefined || String(bruto).trim() === '') return
    if (campo === 'codigo') campos.codigo = String(bruto).trim()
    else if (campo === 'nome') campos.nome = String(bruto).trim().replace(/\s+/g, ' ').slice(0, 80)
    else if (campo === 'marca' || campo === 'fornecedor') campos[campo] = String(bruto).trim().slice(0, 60)
    else if (campo === 'tipo') {
      campos.tipo = tipoCanonico(tipo, bruto)
      if (/^Outr[oa]$/.test(campos.tipo) && !/^outr[oa]$/i.test(String(bruto).trim())) avisos.push(`tipo "${String(bruto).trim()}" virou ${campos.tipo}`)
    } else if (campo === 'unidade') {
      const u = unidadeCanonica(bruto)
      if (u) campos.unidade = u
      else avisos.push(`unidade "${String(bruto).trim()}" não reconhecida, ficou "un"`)
    } else if (campo === 'cor') {
      const c = corDe(bruto)
      if (c) campos.cor = c
      else avisos.push(`cor "${String(bruto).trim()}" não reconhecida`)
    } else if (CAMPOS_NUMERICOS.has(campo)) {
      const lido = lerNumero(bruto)
      if (lido === null) return
      if (!Number.isFinite(lido.valor)) {
        erros.push(`${rotuloCampo(campo)} "${String(bruto).trim()}" não é um número`)
        return
      }
      let v = lido.valor
      const un = lido.unidade || unidades[i]
      if (campo === 'pesoCarretelG') {
        if (un === 'kg' || un === 'quilo' || un === 'quilos') v *= 1000
        else if (!un && v > 0 && v <= 10) v *= 1000
      }
      if (campo === 'volumeFrascoMl') {
        if (un === 'l' || un === 'litro' || un === 'litros' || un === 'lt') v *= 1000
        else if (!un && v > 0 && v <= 10) v *= 1000
      }
      campos[campo] = CAMPOS_MOEDA.has(campo) ? Math.round(v * 100) / 100 : Math.round(v * 1000) / 1000
    }
  })
  return { campos, erros, avisos }
}

function validar(tipo, m) {
  const ok = (v) => Number.isFinite(v)
  if (!String(m.nome || '').trim()) return 'Falta o nome'
  if (m.estoque !== null && m.estoque !== undefined && !(ok(m.estoque) && m.estoque >= 0)) return 'Em estoque não pode ser negativo'
  if (tipo === 'filamentos') {
    if (!(ok(m.custoCarretel) && m.custoCarretel > 0)) return 'Falta o preço do carretel'
    if (!(ok(m.pesoCarretelG) && m.pesoCarretelG > 0)) return 'Peso do carretel inválido'
  } else if (tipo === 'resinas') {
    if (!(ok(m.custoFrasco) && m.custoFrasco > 0)) return 'Falta o preço do frasco'
    if (!(ok(m.volumeFrascoMl) && m.volumeFrascoMl > 0)) return 'Volume do frasco inválido'
  } else {
    if (!(ok(m.precoEmbalagem) && m.precoEmbalagem >= 0)) return 'Falta o preço pago'
    if (!(ok(m.qtdEmbalagem) && m.qtdEmbalagem > 0)) return 'Quantidade no pacote inválida'
  }
  return null
}

function iguais(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9
  return (a ?? '') === (b ?? '')
}

/**
 * Confere a planilha antes de salvar.
 * opcoes.tipos: { [índice da aba]: 'filamentos' | 'resinas' | 'insumos' | null } escolhido na tela.
 * opcoes.quandoNomeExiste: 'atualizar' (padrão) ou 'novo'.
 * opcoes.tipoPadrao: tipo para abas sem pista (ex.: aberto pela aba Insumos).
 */
export function analisarMateriais(abasLidas, dados, opcoes = {}) {
  const { tipos = {}, quandoNomeExiste = 'atualizar', tipoPadrao = 'filamentos' } = opcoes
  const vistos = { filamentos: new Set(), resinas: new Set(), insumos: new Set() }
  const porNomeExistente = {}
  for (const t of TIPOS_MATERIAL) {
    porNomeExistente[t] = new Map()
    for (const m of Object.values(dados[t] || {}).sort((a, b) => n0(a.criadoEm) - n0(b.criadoEm))) {
      const k = nomeChave(m.nome)
      if (k && !porNomeExistente[t].has(k)) porNomeExistente[t].set(k, m)
    }
  }
  const totais = { novo: 0, atualizar: 0, igual: 0, ignoradas: 0 }

  const abas = abasLidas.map((aba, idx) => {
    const cab = acharCabecalho(aba.linhas || [])
    const sugerido = abaDeAjuda(aba.nome) ? null : tipoPelaAba(aba.nome) || (cab && tipoPelasColunas(cab.titulos)) || null
    const incerto = !abaDeAjuda(aba.nome) && !sugerido && !!cab
    const tipo = idx in tipos ? tipos[idx] : sugerido || (incerto ? tipoPadrao : null)
    const base = { idx, nome: aba.nome, tipo, sugerido, incerto, colunas: [], linhas: [], contagem: { novo: 0, atualizar: 0, igual: 0, ignoradas: 0 } }
    if (!cab) return { ...base, tipo: null, motivo: abaDeAjuda(aba.nome) ? 'Aba de instruções' : 'Sem linha de títulos com a coluna Nome' }
    if (!tipo) return { ...base, motivo: abaDeAjuda(aba.nome) ? 'Aba de instruções' : 'Não importar' }

    const mapa = mapearColunas(cab.titulos, tipo)
    const unidades = cab.titulos.map(unidadeTitulo)
    base.colunas = cab.titulos.map((titulo, i) => ({ titulo, campo: mapa[i] })).filter((c) => String(c.titulo).trim())
    const lista = dados[tipo] || {}

    for (let r = cab.r + 1; r < aba.linhas.length; r++) {
      const row = aba.linhas[r] || []
      if (!row.some((c) => c !== null && c !== undefined && String(c).trim() !== '')) continue
      const { campos, erros, avisos } = lerLinha(row, mapa, unidades, tipo)
      if (!Object.keys(campos).length) continue
      // linha "Total" da exportação (ou de uma planilha do usuário) não é material
      if (!campos.codigo && /^(total|totais|total geral|subtotal)$/.test(normalizar(campos.nome || ''))) continue
      const item = { n: r + 1, nome: campos.nome || '', campos, avisos, status: 'novo', erro: null, doc: null, alvo: null, mudancas: [] }
      const conta = (status) => {
        item.status = status
        if (status === 'novo' || status === 'atualizar' || status === 'igual') base.contagem[status] += 1
        else base.contagem.ignoradas += 1
      }
      if (/^exemplo\b/.test(normalizar(item.nome))) {
        conta('exemplo')
        base.linhas.push(item)
        continue
      }
      if (erros.length) {
        item.erro = erros.join('; ')
        conta('erro')
        base.linhas.push(item)
        continue
      }
      const { codigo, ...valores } = campos
      let alvo = codigo && lista[codigo] ? lista[codigo] : null
      if (!alvo && quandoNomeExiste === 'atualizar' && valores.nome) alvo = porNomeExistente[tipo].get(nomeChave(valores.nome)) || null
      if (!alvo && !valores.nome) {
        item.erro = codigo ? 'Código não encontrado e sem nome' : 'Falta o nome'
        conta('erro')
        base.linhas.push(item)
        continue
      }
      const chave = alvo ? `id:${alvo.id}` : `nome:${nomeChave(valores.nome)}`
      if (vistos[tipo].has(chave)) {
        item.erro = 'Repetido na planilha (vale a primeira linha)'
        conta('repetido')
        base.linhas.push(item)
        continue
      }
      vistos[tipo].add(chave)

      if (alvo) {
        const doc = { ...alvo, ...valores }
        const erro = validar(tipo, doc)
        item.alvo = alvo
        item.nome = doc.nome
        if (erro) {
          item.erro = erro
          conta('erro')
        } else {
          item.mudancas = Object.keys(valores).filter((k) => !iguais(alvo[k], valores[k]))
          item.doc = doc
          conta(item.mudancas.length ? 'atualizar' : 'igual')
        }
      } else {
        const doc = { ...PADRAO[tipo](), ...valores, id: idValido(codigo) ? codigo : novoId() }
        if (tipo === 'filamentos' && !('tipo' in valores)) doc.tipo = tipoPeloNome(doc.nome) || 'PLA'
        if (tipo !== 'insumos' && !('cor' in valores)) {
          const c = corDe(doc.nome, true)
          if (c) doc.cor = c
        }
        const erro = validar(tipo, doc)
        if (erro) {
          item.erro = erro
          conta('erro')
        } else {
          item.doc = doc
          conta('novo')
        }
      }
      base.linhas.push(item)
    }
    for (const k of Object.keys(totais)) totais[k] += base.contagem[k]
    return base
  })

  return { abas, totais }
}

/** Documentos a salvar, por coleção. */
export function documentosParaSalvar(analise) {
  const saida = { filamentos: [], resinas: [], insumos: [] }
  for (const aba of analise.abas) {
    if (!aba.tipo) continue
    for (const l of aba.linhas) if ((l.status === 'novo' || l.status === 'atualizar') && l.doc) saida[aba.tipo].push(l.doc)
  }
  return saida
}
