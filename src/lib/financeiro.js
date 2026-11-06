// Financeiro: vendas, recebimentos, contas a receber e lucro estimado por período, e a planilha para o Excel.
import { novoLivro } from './excel.js'
import { precificar } from './pricing.js'
import { diffDias, fmtData, hojeISO, isoDe, n0, numeroDoc } from './format.js'
import { atrasado, etapaVisivel, recebidoPedido, rotuloEtapa, saldoPedido, statusOrcamento, subtotalItens, totalOrcamento, validadeOrcamento } from './negocio.js'

export const PERIODOS = [
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'mes-passado', rotulo: 'Mês passado' },
  { valor: '3meses', rotulo: 'Últimos 3 meses' },
  { valor: 'ano', rotulo: 'Este ano' },
  { valor: 'tudo', rotulo: 'Tudo' },
  { valor: 'datas', rotulo: 'Escolher datas' },
]

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** { de, ate } em ISO (null = sem limite). */
export function intervaloDe(periodo, de, ate) {
  const [y, m] = hojeISO().split('-').map(Number)
  const primeiro = (yy, mm) => isoDe(new Date(yy, mm - 1, 1))
  const ultimo = (yy, mm) => isoDe(new Date(yy, mm, 0))
  switch (periodo) {
    case 'mes':
      return { de: primeiro(y, m), ate: ultimo(y, m) }
    case 'mes-passado':
      return { de: primeiro(y, m - 1), ate: ultimo(y, m - 1) }
    case '3meses':
      return { de: primeiro(y, m - 2), ate: ultimo(y, m) }
    case 'ano':
      return { de: `${y}-01-01`, ate: `${y}-12-31` }
    case 'datas': {
      const a = de || null
      const b = ate || null
      return a && b && a > b ? { de: b, ate: a } : { de: a, ate: b }
    }
    default:
      return { de: null, ate: null }
  }
}

export function rotuloIntervalo({ de, ate }) {
  if (de && ate) return `${fmtData(de)} a ${fmtData(ate)}`
  if (de) return `a partir de ${fmtData(de)}`
  if (ate) return `até ${fmtData(ate)}`
  return 'todo o período'
}

export function rotuloMes(chave) {
  const [y, m] = String(chave).split('-').map(Number)
  return `${MESES[m - 1] || '?'}/${y}`
}

function dataDoPedido(p) {
  return Number.isFinite(p.criadoEm) ? isoDe(new Date(p.criadoEm)) : null
}

function entregueEm(p) {
  if (p.cancelado || p.etapa !== 'entregue') return null
  const h = [...(p.historico || [])].reverse().find((x) => x.para === 'entregue' && Number.isFinite(x.em))
  return h ? isoDe(new Date(h.em)) : null
}

/** Custo de uma unidade: o guardado na venda; para pedidos antigos, o cálculo atual do produto. */
function criarCustoUnitario(dados, ctx) {
  const cache = new Map()
  return (it) => {
    if (Number.isFinite(it.custoUnitario)) return it.custoUnitario
    const p = dados.produtos?.[it.produtoId]
    if (!p || !ctx) return null
    if (!cache.has(p.id)) {
      let custo = null
      try {
        const res = precificar(p, ctx)
        custo = Number.isFinite(res.total) && res.total > 0 ? res.total : null
      } catch (e) {
        custo = null
      }
      cache.set(p.id, custo)
    }
    return cache.get(p.id)
  }
}

const vazioMes = () => ({ pedidos: 0, vendido: 0, produtos: 0, envio: 0, descontos: 0, recebido: 0, devolvido: 0, aReceber: 0, custo: 0, imposto: 0, lucro: 0, baseLucro: 0, semCusto: 0 })

/**
 * Junta tudo o que a tela e a planilha precisam para o período.
 * Vendas contam pela data do pedido; recebimentos e devoluções, pela data do pagamento (regime de caixa).
 */
export function analisarFinanceiro(dados, ctx, intervalo = {}) {
  const { de = null, ate = null } = intervalo
  const dentro = (iso) => (!de && !ate) || (!!iso && (!de || iso >= de) && (!ate || iso <= ate))
  const custoUnitario = criarCustoUnitario(dados, ctx)
  const imposto = n0(ctx?.impostoPct)
  const hoje = hojeISO()
  const todos = Object.values(dados.pedidos || {}).sort((a, b) => n0(a.numero) - n0(b.numero))
  const meses = new Map()
  const mes = (iso) => {
    const k = String(iso || '').slice(0, 7)
    if (!meses.has(k)) meses.set(k, vazioMes())
    return meses.get(k)
  }

  const pedidos = []
  const itens = []
  for (const p of todos) {
    const data = dataDoPedido(p)
    if (!dentro(data)) continue
    const subtotal = subtotalItens(p.itens)
    const desconto = n0(p.desconto)
    const envio = n0(p.valorEnvio)
    const base = Math.max(0, subtotal - desconto)
    let custo = 0
    let custoCompleto = true
    for (const it of p.itens || []) {
      const qtd = n0(it.quantidade)
      const preco = n0(it.precoUnitario)
      const totalItem = qtd * preco
      const descItem = subtotal > 0 ? desconto * (totalItem / subtotal) : 0
      const cu = custoUnitario(it)
      const custoItem = cu === null ? null : cu * qtd
      if (custoItem === null) custoCompleto = false
      else custo += custoItem
      if (!p.cancelado) {
        itens.push({
          p,
          data,
          it,
          qtd,
          preco,
          total: totalItem,
          desconto: descItem,
          custoUnit: cu,
          custo: custoItem,
          lucro: custoItem === null ? null : (totalItem - descItem) * (1 - imposto) - custoItem,
        })
      }
    }
    const impostoValor = base * imposto
    const lucro = custoCompleto ? base - impostoValor - custo : null
    const linha = {
      p,
      data,
      subtotal,
      envio,
      desconto,
      total: n0(p.total),
      recebido: recebidoPedido(p),
      saldo: saldoPedido(p),
      custo: custoCompleto ? custo : null,
      imposto: impostoValor,
      lucro,
      margem: lucro !== null && base > 0 ? lucro / base : null,
      entregueEm: entregueEm(p),
      atrasado: atrasado(p),
    }
    pedidos.push(linha)
    if (!p.cancelado) {
      const m = mes(data)
      m.pedidos += 1
      m.vendido += linha.total
      m.produtos += subtotal
      m.envio += envio
      m.descontos += desconto
      m.aReceber += linha.saldo
      m.imposto += impostoValor
      if (lucro === null) m.semCusto += 1
      else {
        m.custo += custo
        m.lucro += lucro
        m.baseLucro += base
      }
    }
  }

  const movimentos = []
  for (const p of todos) {
    for (const r of p.recebimentos || []) {
      if (!dentro(r.data)) continue
      movimentos.push({ data: r.data, tipo: 'Recebimento', valor: n0(r.valor), meio: r.meio || '', obs: r.obs || '', p })
      mes(r.data).recebido += n0(r.valor)
    }
    for (const r of p.devolucoes || []) {
      if (!dentro(r.data)) continue
      movimentos.push({ data: r.data, tipo: 'Devolução', valor: -n0(r.valor), meio: r.meio || '', obs: r.motivo || '', p })
      mes(r.data).devolvido += n0(r.valor)
    }
  }
  movimentos.sort((a, b) => String(a.data).localeCompare(String(b.data)) || n0(a.p.numero) - n0(b.p.numero))

  const aReceber = todos
    .filter((p) => !p.cancelado && saldoPedido(p) > 0.004)
    .map((p) => ({
      p,
      data: dataDoPedido(p),
      total: n0(p.total),
      recebido: recebidoPedido(p),
      saldo: saldoPedido(p),
      prazo: p.prazo || null,
      atrasoDias: p.prazo && p.etapa !== 'entregue' ? Math.max(0, diffDias(hoje, p.prazo)) : 0,
    }))
    .sort((a, b) => String(a.prazo || '9999').localeCompare(String(b.prazo || '9999')) || n0(a.p.numero) - n0(b.p.numero))

  const orcamentos = Object.values(dados.orcamentos || {})
    .filter((o) => dentro(o.emitidoEm))
    .sort((a, b) => n0(a.numero) - n0(b.numero))

  const listaMeses = [...meses.entries()].filter(([k]) => k).sort(([a], [b]) => a.localeCompare(b))
  const t = vazioMes()
  for (const [, m] of listaMeses) for (const k of Object.keys(t)) t[k] += m[k]

  const totais = {
    ...t,
    liquido: t.recebido - t.devolvido,
    margem: t.baseLucro > 0 ? t.lucro / t.baseLucro : null,
    ticket: t.pedidos ? t.vendido / t.pedidos : 0,
    cancelados: pedidos.filter((x) => x.p.cancelado).length,
    aReceberHoje: aReceber.reduce((s, x) => s + x.saldo, 0),
    orcEmitidos: orcamentos.length,
    orcAprovados: orcamentos.filter((o) => o.status === 'aprovado').length,
  }

  return { intervalo: { de, ate }, pedidos, itens, movimentos, aReceber, orcamentos, meses: listaMeses, totais }
}

const NOTA_ESTIMATIVA =
  'Custo e lucro são estimativas: usam o custo do produto guardado na venda (pedidos antigos usam o cálculo atual do produto). Lucro = produtos − descontos − imposto − custo; o envio cobrado não entra no lucro.'

/** Planilha financeira completa do período. */
export async function xlsxFinanceiro(dados, ctx, intervalo) {
  const f = analisarFinanceiro(dados, ctx, intervalo)
  const t = f.totais
  const cfg = dados.config || {}
  const negocio = cfg.negocio?.nome?.trim() || 'Bancada 3D'
  const clientes = dados.clientes || {}
  const whats = (p) => clientes[p.clienteId]?.whatsapp || ''
  const livro = await novoLivro(`Financeiro — ${negocio}`)
  const M = (v) => ({ v, tipo: 'moeda' })

  livro.aba('Resumo', {
    antes: [
      [`Relatório financeiro — ${negocio}`],
      ['Período', rotuloIntervalo(f.intervalo)],
      ['Gerado em', { v: Date.now(), tipo: 'datahora' }],
      [],
      ['Indicador', 'Valor'],
      ['Pedidos no período', { v: t.pedidos, tipo: 'inteiro' }],
      ['Vendido (total dos pedidos)', M(t.vendido)],
      ['Produtos', M(t.produtos)],
      ['Envio cobrado', M(t.envio)],
      ['Descontos', M(t.descontos)],
      ['Recebido', M(t.recebido)],
      ['Devolvido', M(t.devolvido)],
      ['Recebido líquido', M(t.liquido)],
      ['A receber dos pedidos do período', M(t.aReceber)],
      ['A receber hoje (todos os pedidos em aberto)', M(t.aReceberHoje)],
      ['Custo estimado dos produtos', M(t.custo)],
      ['Imposto estimado', M(t.imposto)],
      ['Lucro estimado', M(t.lucro)],
      ['Margem estimada', t.margem === null ? '—' : { v: t.margem, tipo: 'pct' }],
      ['Ticket médio', M(t.ticket)],
      ['Pedidos cancelados', { v: t.cancelados, tipo: 'inteiro' }],
      ['Orçamentos emitidos', { v: t.orcEmitidos, tipo: 'inteiro' }],
      ['Orçamentos aprovados', { v: t.orcAprovados, tipo: 'inteiro' }],
      [],
      ['Por mês'],
    ],
    colunas: [
      { titulo: 'Mês', tipo: 'mes' },
      { titulo: 'Pedidos', tipo: 'inteiro' },
      { titulo: 'Vendido', tipo: 'moeda' },
      { titulo: 'Produtos', tipo: 'moeda' },
      { titulo: 'Envio', tipo: 'moeda' },
      { titulo: 'Descontos', tipo: 'moeda' },
      { titulo: 'Recebido', tipo: 'moeda' },
      { titulo: 'Devolvido', tipo: 'moeda' },
      { titulo: 'Recebido líquido', tipo: 'moeda' },
      { titulo: 'A receber', tipo: 'moeda' },
      { titulo: 'Custo estimado', tipo: 'moeda' },
      { titulo: 'Imposto estimado', tipo: 'moeda' },
      { titulo: 'Lucro estimado', tipo: 'moeda' },
      { titulo: 'Margem', tipo: 'pct' },
      { titulo: 'Ticket médio', tipo: 'moeda' },
    ],
    linhas: f.meses.map(([k, m]) => [
      `${k}-01`,
      m.pedidos,
      m.vendido,
      m.produtos,
      m.envio,
      m.descontos,
      m.recebido,
      m.devolvido,
      m.recebido - m.devolvido,
      m.aReceber,
      m.custo,
      m.imposto,
      m.lucro,
      m.baseLucro > 0 ? m.lucro / m.baseLucro : null,
      m.pedidos ? m.vendido / m.pedidos : null,
    ]),
    total: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    filtro: false,
    depois: [[NOTA_ESTIMATIVA]],
  })

  livro.aba('Movimentações', {
    antes: [[`Entradas e devoluções pela data do pagamento — ${rotuloIntervalo(f.intervalo)}`], []],
    colunas: [
      { titulo: 'Data', tipo: 'data' },
      { titulo: 'Tipo' },
      { titulo: 'Pedido' },
      { titulo: 'Cliente' },
      { titulo: 'Meio de pagamento' },
      { titulo: 'Valor', tipo: 'moeda' },
      { titulo: 'Observação' },
    ],
    linhas: f.movimentos.map((m) => [m.data, m.tipo, numeroDoc(m.p.numero), m.p.clienteNome || '', m.meio, m.valor, m.obs]),
    total: [5],
  })

  livro.aba('Pedidos', {
    colunas: [
      { titulo: 'Pedido' },
      { titulo: 'Data', tipo: 'data' },
      { titulo: 'Cliente' },
      { titulo: 'WhatsApp' },
      { titulo: 'Situação' },
      { titulo: 'Prazo', tipo: 'data' },
      { titulo: 'Entregue em', tipo: 'data' },
      { titulo: 'Itens', largura: 40 },
      { titulo: 'Qtd. de itens', tipo: 'inteiro' },
      { titulo: 'Produtos', tipo: 'moeda' },
      { titulo: 'Envio', tipo: 'moeda' },
      { titulo: 'Desconto', tipo: 'moeda' },
      { titulo: 'Total', tipo: 'moeda' },
      { titulo: 'Recebido', tipo: 'moeda' },
      { titulo: 'A receber', tipo: 'moeda' },
      { titulo: 'Custo estimado', tipo: 'moeda' },
      { titulo: 'Imposto estimado', tipo: 'moeda' },
      { titulo: 'Lucro estimado', tipo: 'moeda' },
      { titulo: 'Margem', tipo: 'pct' },
      { titulo: 'Origem' },
      { titulo: 'Observações', largura: 30 },
    ],
    linhas: f.pedidos
      .filter((x) => !x.p.cancelado)
      .map((x) => {
        const p = x.p
        const orc = p.orcamentoId ? dados.orcamentos?.[p.orcamentoId] : null
        return [
          numeroDoc(p.numero),
          x.data,
          p.clienteNome || '',
          whats(p),
          rotuloEtapa(etapaVisivel(p)) + (x.atrasado ? ' (atrasado)' : ''),
          p.prazo || null,
          x.entregueEm,
          (p.itens || []).map((it) => `${it.quantidade}× ${it.nome}`).join('; '),
          (p.itens || []).reduce((s, it) => s + n0(it.quantidade), 0),
          x.subtotal,
          x.envio,
          x.desconto,
          x.total,
          x.recebido,
          x.saldo,
          x.custo,
          x.imposto,
          x.lucro,
          x.margem,
          orc ? `Orçamento ${numeroDoc(orc.numero)}` : p.origem === 'orcamento' ? 'Orçamento' : 'Catálogo',
          p.observacoes || '',
        ]
      }),
    total: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  })

  const cancelados = f.pedidos.filter((x) => x.p.cancelado)
  livro.aba('Cancelados', {
    antes: [['Pedidos cancelados no período (não entram nas vendas). O que foi recebido e devolvido aparece em Movimentações.'], []],
    colunas: [
      { titulo: 'Pedido' },
      { titulo: 'Data', tipo: 'data' },
      { titulo: 'Cliente' },
      { titulo: 'Itens', largura: 40 },
      { titulo: 'Total', tipo: 'moeda' },
      { titulo: 'Recebido líquido', tipo: 'moeda' },
      { titulo: 'Motivo', largura: 34 },
    ],
    linhas: cancelados.map((x) => {
      const h = [...(x.p.historico || [])].reverse().find((r) => r.tipo === 'cancelado')
      return [numeroDoc(x.p.numero), x.data, x.p.clienteNome || '', (x.p.itens || []).map((it) => `${it.quantidade}× ${it.nome}`).join('; '), x.total, x.recebido, h?.motivo || '']
    }),
    total: [4, 5],
  })

  livro.aba('Itens vendidos', {
    colunas: [
      { titulo: 'Pedido' },
      { titulo: 'Data', tipo: 'data' },
      { titulo: 'Cliente' },
      { titulo: 'Produto', largura: 32 },
      { titulo: 'SKU' },
      { titulo: 'Quantidade', tipo: 'decimal' },
      { titulo: 'Preço unitário', tipo: 'moeda' },
      { titulo: 'Total do item', tipo: 'moeda' },
      { titulo: 'Desconto rateado', tipo: 'moeda' },
      { titulo: 'Custo unitário', tipo: 'moeda' },
      { titulo: 'Custo total', tipo: 'moeda' },
      { titulo: 'Lucro estimado', tipo: 'moeda' },
    ],
    linhas: f.itens.map((x) => [numeroDoc(x.p.numero), x.data, x.p.clienteNome || '', x.it.nome || '', x.it.sku || '', x.qtd, x.preco, x.total, x.desconto, x.custoUnit, x.custo, x.lucro]),
    total: [5, 7, 8, 10, 11],
  })

  livro.aba('A receber', {
    antes: [[`Pedidos com valor em aberto hoje (${fmtData(hojeISO())}), de qualquer data`], []],
    colunas: [
      { titulo: 'Pedido' },
      { titulo: 'Data', tipo: 'data' },
      { titulo: 'Cliente' },
      { titulo: 'WhatsApp' },
      { titulo: 'Total', tipo: 'moeda' },
      { titulo: 'Recebido', tipo: 'moeda' },
      { titulo: 'A receber', tipo: 'moeda' },
      { titulo: 'Prazo', tipo: 'data' },
      { titulo: 'Situação' },
      { titulo: 'Dias de atraso', tipo: 'inteiro' },
    ],
    linhas: f.aReceber.map((x) => [numeroDoc(x.p.numero), x.data, x.p.clienteNome || '', whats(x.p), x.total, x.recebido, x.saldo, x.prazo, rotuloEtapa(x.p.etapa), x.atrasoDias || null]),
    total: [4, 5, 6],
  })

  livro.aba('Orçamentos', {
    colunas: [
      { titulo: 'Orçamento' },
      { titulo: 'Emitido', tipo: 'data' },
      { titulo: 'Válido até', tipo: 'data' },
      { titulo: 'Cliente' },
      { titulo: 'Situação' },
      { titulo: 'Itens', largura: 40 },
      { titulo: 'Total', tipo: 'moeda' },
      { titulo: 'Pedido gerado' },
    ],
    linhas: f.orcamentos.map((o) => {
      const ped = o.pedidoId ? dados.pedidos?.[o.pedidoId] : null
      return [
        numeroDoc(o.numero),
        o.emitidoEm || null,
        validadeOrcamento(o),
        o.clienteNome || '',
        statusOrcamento(o).rotulo,
        (o.itens || []).map((it) => `${it.quantidade}× ${it.nome}`).join('; '),
        totalOrcamento(o),
        ped ? numeroDoc(ped.numero) : '',
      ]
    }),
    total: [6],
  })

  const fixos = cfg.custosFixos || []
  const somaFixos = fixos.reduce((s, x) => s + n0(x.valorMensal), 0)
  const producao = n0(cfg.producaoMensalUnidades)
  livro.aba('Custos fixos', {
    colunas: [{ titulo: 'Custo fixo', largura: 34 }, { titulo: 'Valor mensal', tipo: 'moeda' }],
    linhas: fixos.map((x) => [x.nome || 'Sem nome', n0(x.valorMensal)]),
    total: [1],
    filtro: false,
    depois: [
      ['Produção mensal (unidades)', producao ? { v: producao, tipo: 'inteiro' } : 'não informada'],
      ['Rateio por unidade', producao ? M(somaFixos / producao) : '—'],
    ],
  })

  return livro.blob()
}

export function nomeArquivoFinanceiro({ de, ate }) {
  return de || ate ? `financeiro-${de || 'inicio'}-a-${ate || hojeISO()}.xlsx` : `financeiro-completo-${hojeISO()}.xlsx`
}
