// Motor de precificação.
// Custos por peça (FDM e resina), rateio por unidades na mesa, markup sobre o custo
// e preço por canal de venda preservando o lucro da venda direta.

import { n0 } from './format.js'

/** Reserva anual de manutenção, como fração do valor do equipamento. */
export const MANUTENCAO_ANUAL_FDM = { basico: 0.05, medio: 0.1, profissional: 0.15, intenso: 0.25 }
export const MANUTENCAO_ANUAL_RESINA = { basico: 0.04, medio: 0.08, profissional: 0.12, intenso: 0.16 }
export const MANUTENCAO_ANUAL_LAVAGEM_CURA = 0.05

export const NIVEIS_USO = [
  { valor: 'basico', rotulo: 'Leve', desc: 'peças simples, uso ocasional' },
  { valor: 'medio', rotulo: 'Médio', desc: 'uso regular com PLA e PETG' },
  { valor: 'profissional', rotulo: 'Pesado', desc: 'produção diária em alta velocidade' },
  { valor: 'intenso', rotulo: 'Intenso', desc: 'quase 24 h por dia ou filamentos abrasivos' },
]

export const LCD_PADRAO = { preco: 400, vidaHoras: 2000 }
export const FEP_PADRAO = { preco: 60, vidaImpressoes: 40 }

// ---------- Custos-base de cadastros ----------

/** Horas em que o equipamento precisa se pagar. */
export function horasAmortizacao(eq) {
  if (!eq) return 0
  const a = eq.amortizacao || {}
  if (a.modo === 'vidaUtil') return n0(a.horas)
  return n0(a.meses) * n0(eq.horasPorDia) * n0(eq.diasPorMes)
}

/** Custo da máquina por hora de uso (valor ÷ horas de amortização). */
export function custoHoraMaquina(eq) {
  const h = horasAmortizacao(eq)
  return h > 0 ? n0(eq.valor) / h : 0
}

/** Reserva de manutenção por hora: % anual do valor ÷ horas de uso em 12 meses. */
export function custoHoraManutencao(eq, pctAnual) {
  if (!eq) return 0
  const horasAno = n0(eq.horasPorDia) * n0(eq.diasPorMes) * 12
  return horasAno > 0 ? (n0(eq.valor) * n0(pctAnual)) / horasAno : 0
}

export function pctManutencao(impressora) {
  if (!impressora) return 0
  const tabela = impressora.processo === 'resina' ? MANUTENCAO_ANUAL_RESINA : MANUTENCAO_ANUAL_FDM
  return tabela[impressora.nivelUso] ?? tabela.medio
}

export function custoGramaFilamento(f) {
  return f && n0(f.pesoCarretelG) > 0 ? n0(f.custoCarretel) / n0(f.pesoCarretelG) : 0
}

export function custoLitroResina(r) {
  return r && n0(r.volumeFrascoMl) > 0 ? (n0(r.custoFrasco) / n0(r.volumeFrascoMl)) * 1000 : 0
}

export function precoUnidadeInsumo(i) {
  return i && n0(i.qtdEmbalagem) > 0 ? n0(i.precoEmbalagem) / n0(i.qtdEmbalagem) : 0
}

// ---------- Custo de uma peça ----------

const zeroPeca = () => ({
  material: 0,
  perdasMaterial: 0,
  energia: 0,
  maquina: 0,
  manutencao: 0,
  lcd: 0,
  fep: 0,
  acabamento: 0,
  falhas: 0,
  total: 0,
  avisos: [],
})

function somaPeca(c) {
  return (
    c.material + c.perdasMaterial + c.energia + c.maquina + c.manutencao + c.lcd + c.fep + c.acabamento + c.falhas
  )
}

export function unidadesNaMesa(peca) {
  return Math.max(Math.floor(n0(peca?.unidadesPorMesa)) || 1, 1)
}

export function custoPecaFdm(peca, ctx) {
  const c = zeroPeca()
  const imp = ctx.impressoras[peca.impressoraId]
  if (!imp) c.avisos.push('Impressora não encontrada no Meu QG.')
  const un = unidadesNaMesa(peca)
  const horas = n0(peca.tempoImpressaoHoras)
  let custoMesa = 0
  let gramas = 0
  let primeiroCustoGrama = 0
  ;(peca.consumos || []).forEach((cons, i) => {
    const fil = ctx.filamentos[cons.filamentoId]
    if (!fil && cons.filamentoId) c.avisos.push('Um filamento usado não existe mais no Meu QG.')
    const cg = custoGramaFilamento(fil)
    if (i === 0) primeiroCustoGrama = cg
    custoMesa += cg * n0(cons.gramasMesa)
    gramas += n0(cons.gramasMesa)
  })
  const custoMedioGrama = gramas > 0 ? custoMesa / gramas : primeiroCustoGrama
  c.material = custoMesa / un
  c.perdasMaterial = (n0(peca.purgaGramas) * custoMedioGrama) / un
  if (imp) {
    c.energia = (horas * (n0(imp.potenciaW) / 1000) * n0(ctx.tarifaKwh)) / un
    c.maquina = (custoHoraMaquina(imp) * horas) / un
    c.manutencao = (custoHoraManutencao(imp, pctManutencao(imp)) * horas) / un
  }
  c.acabamento = c.material * n0(peca.acabamentoPct)
  const falhasPct = peca.reservaFalhasPct ?? imp?.falhasPct ?? 0
  c.falhas = (c.material + c.perdasMaterial + c.energia + c.maquina + c.manutencao) * n0(falhasPct)
  c.total = somaPeca(c)
  return c
}

export function custoPecaResina(peca, ctx) {
  const c = zeroPeca()
  const imp = ctx.impressoras[peca.impressoraId]
  const resina = ctx.resinas[peca.resinaId]
  const estacao = peca.washCureId ? ctx.washcures[peca.washCureId] : null
  if (!imp) c.avisos.push('Impressora não encontrada no Meu QG.')
  if (!resina && peca.resinaId) c.avisos.push('A resina usada não existe mais no Meu QG.')
  const un = unidadesNaMesa(peca)
  const horas = n0(peca.tempoImpressaoHoras)
  const horasPos = (n0(peca.tempoLavagemMin) + n0(peca.tempoCuraMin)) / 60
  c.material = (n0(peca.volumeMl) * custoLitroResina(resina)) / 1000 / un
  c.perdasMaterial = c.material * n0(peca.perdasPct)
  let energia = 0
  let maquina = 0
  let manutencao = 0
  if (imp) {
    energia = horas * (n0(imp.potenciaW) / 1000) * n0(ctx.tarifaKwh)
    maquina = custoHoraMaquina(imp) * horas
    manutencao = custoHoraManutencao(imp, pctManutencao(imp)) * horas
  }
  if (estacao) {
    energia += horasPos * (n0(estacao.potenciaW) / 1000) * n0(ctx.tarifaKwh)
    maquina += custoHoraMaquina(estacao) * horasPos
    manutencao += custoHoraManutencao(estacao, MANUTENCAO_ANUAL_LAVAGEM_CURA) * horasPos
  }
  c.energia = energia / un
  c.maquina = maquina / un
  c.manutencao = manutencao / un
  const lcd = imp?.lcd || LCD_PADRAO
  const fep = imp?.fep || FEP_PADRAO
  c.lcd = imp && n0(lcd.vidaHoras) > 0 ? ((n0(lcd.preco) / n0(lcd.vidaHoras)) * horas) / un : 0
  c.fep = imp && n0(fep.vidaImpressoes) > 0 ? n0(fep.preco) / n0(fep.vidaImpressoes) / un : 0
  const falhasPct = peca.reservaFalhasPct ?? imp?.falhasPct ?? 0
  c.falhas =
    (c.material + c.perdasMaterial + c.energia + c.maquina + c.manutencao + c.lcd + c.fep) * n0(falhasPct)
  c.total = somaPeca(c)
  return c
}

export function custoPeca(peca, ctx) {
  return peca.processo === 'resina' ? custoPecaResina(peca, ctx) : custoPecaFdm(peca, ctx)
}

// ---------- Faixas de taxa (canais como a Shopee) ----------

const EPS = 16 * Number.EPSILON

function emCentavos(v) {
  return Math.round(100 * v)
}

function faixaDoPreco(faixas, centavos) {
  return faixas.find((f) => f.ate === null || f.ate === undefined || centavos <= emCentavos(f.ate)) || faixas[faixas.length - 1]
}

function taxasNaFaixa(faixa, preco) {
  const adicional = faixa.adicional?.tipo === 'percentual' ? preco * n0(faixa.adicional.pct) : n0(faixa.adicional?.valor)
  return { taxaPct: n0(faixa.taxaPct), adicional, total: preco * n0(faixa.taxaPct) + adicional, faixa }
}

export function temFaixas(canal) {
  return Array.isArray(canal?.faixas) && canal.faixas.length > 0
}

/** Taxas cobradas pelo canal num preço. */
export function taxasDoCanal(canal, preco) {
  if (temFaixas(canal)) return taxasNaFaixa(faixaDoPreco(canal.faixas, emCentavos(preco)), emCentavos(preco) / 100)
  return {
    taxaPct: n0(canal.taxaPct),
    adicional: n0(canal.taxaFixa),
    total: preco * n0(canal.taxaPct) + n0(canal.taxaFixa),
    faixa: null,
  }
}

/** Menor preço (em centavos) que mantém o líquido da venda direta, testando faixa por faixa. */
function menorPrecoComFaixas(precoDireto, canal, imposto) {
  const alvo = precoDireto * (1 - imposto)
  let minimo = 0
  let melhor = Infinity
  for (const f of canal.faixas) {
    const maximo = f.ate === null || f.ate === undefined ? 1e11 : emCentavos(f.ate)
    const fixo = f.adicional?.tipo === 'fixo' ? n0(f.adicional.valor) : 0
    const pctAd = f.adicional?.tipo === 'percentual' ? n0(f.adicional.pct) : 0
    const k = 1 - n0(f.taxaPct) - pctAd - imposto
    if (k <= 0) {
      minimo = maximo + 1
      continue
    }
    const liquido = (centavos) => (centavos / 100) * k - fixo
    const tol = EPS * Math.max(1, alvo, fixo)
    let cand = minimo
    if (liquido(cand) + tol < alvo) {
      const exato = ((alvo + fixo) / k) * 100
      cand = Math.max(minimo, Math.ceil(exato - EPS * Math.abs(exato)))
      if (liquido(cand) + tol < alvo) cand += 1
    }
    if (Number.isSafeInteger(cand) && cand <= maximo && liquido(cand) + tol >= alvo) melhor = Math.min(melhor, cand / 100)
    minimo = maximo + 1
  }
  return melhor
}

/** Preço no canal que deixa o mesmo líquido da venda direta (preço × (1 − imposto)). */
export function precoNoCanal(precoDireto, canal, imposto) {
  if (!Number.isFinite(precoDireto) || precoDireto < 0 || !Number.isFinite(imposto) || imposto < 0 || imposto >= 1)
    return Infinity
  if (temFaixas(canal)) return menorPrecoComFaixas(precoDireto, canal, imposto)
  const k = 1 - n0(canal.taxaPct) - imposto
  return k <= 0 ? Infinity : (precoDireto * (1 - imposto) + n0(canal.taxaFixa)) / k
}

export function montarPrecoCanal(precoDireto, custo, canal, imposto, lucroDireto) {
  const preco = Number.isFinite(custo) && custo >= 0 ? precoNoCanal(precoDireto, canal, imposto) : Infinity
  if (!Number.isFinite(preco)) {
    return { canal, preco: Infinity, taxas: 0, imposto: 0, custoTotal: custo, lucro: lucroDireto, margem: 0, taxaRegra: null }
  }
  const tx = taxasDoCanal(canal, preco)
  const imp = preco * imposto
  const custoTotal = custo + tx.total + imp
  const lucro = preco - custoTotal
  return {
    canal,
    preco,
    taxas: tx.total,
    imposto: imp,
    custoTotal,
    lucro,
    margem: preco > 0 ? lucro / preco : 0,
    taxaRegra: tx,
  }
}

/**
 * Aviso de degrau: alguma faixa abaixo do preço deixa mais dinheiro no bolso?
 * Retorna { precoAlternativo, liquidoAlternativo, liquidoAtual } ou null.
 */
export function avisoDegrau(canal, preco, imposto) {
  if (!temFaixas(canal) || !Number.isFinite(preco) || preco < 0 || imposto >= 1) return null
  const c = emCentavos(preco)
  const p = c / 100
  const liquidoAtual = p * (1 - imposto) - taxasNaFaixa(faixaDoPreco(canal.faixas, c), p).total
  let melhor = null
  for (const f of canal.faixas) {
    if (f.ate === null || f.ate === undefined || emCentavos(f.ate) >= c) break
    const alt = f.ate * (1 - imposto) - taxasNaFaixa(f, f.ate).total
    if (emCentavos(alt) > emCentavos(liquidoAtual) && (!melhor || alt > melhor.liquidoAlternativo)) {
      melhor = { precoAlternativo: f.ate, liquidoAlternativo: alt, liquidoAtual }
    }
  }
  return melhor
}

/** Quando a sugestão caiu numa faixa mais cara, mostra o que sobraria no topo da faixa anterior. */
export function avisoFaixaSugestao(canal, preco, imposto) {
  if (!temFaixas(canal) || !Number.isFinite(preco)) return null
  const atual = taxasDoCanal(canal, preco).faixa
  const idx = canal.faixas.indexOf(atual)
  if (idx <= 0) return null
  const limiteAnterior = canal.faixas[idx - 1].ate
  if (limiteAnterior === null || limiteAnterior === undefined) return null
  const inicioFaixa = (emCentavos(limiteAnterior) + 1) / 100
  const aviso = avisoDegrau(canal, inicioFaixa, imposto)
  return aviso ? { inicioFaixa, ...aviso } : null
}

// ---------- Produto completo ----------

export function custoInsumos(produto, ctx) {
  let total = 0
  const linhas = []
  for (const item of produto.insumos || []) {
    const ins = ctx.insumos[item.insumoId]
    const unit = precoUnidadeInsumo(ins)
    const valor = unit * n0(item.quantidade)
    total += valor
    linhas.push({ ...item, insumo: ins, unit, valor })
  }
  return { total, linhas }
}

export function rateioFixos(ctx) {
  return n0(ctx.producaoMensalUnidades) > 0 ? n0(ctx.custosFixosMensais) / n0(ctx.producaoMensalUnidades) : 0
}

/**
 * Calcula custo, preços sugeridos e preço por canal de um produto.
 * Retorna também a composição do custo para o gráfico "De onde vem o custo".
 */
export function precificar(produto, ctx) {
  const pecas = (produto.pecas || []).map((p) => ({ peca: p, custo: custoPeca(p, ctx) }))
  const producao = pecas.reduce((s, x) => s + x.custo.total, 0)
  const maoDeObra = (n0(produto.minutosTrabalho) / 60) * n0(ctx.custoHoraTrabalho)
  const ins = custoInsumos(produto, ctx)
  const fixos = produto.incluirFixos === false ? 0 : rateioFixos(ctx)
  const total = producao + maoDeObra + ins.total + fixos

  const soma = (k) => pecas.reduce((s, x) => s + x.custo[k], 0)
  const composicao = [
    { chave: 'material', rotulo: 'Material', valor: soma('material') },
    { chave: 'perdas', rotulo: 'Purga e perdas', valor: soma('perdasMaterial') },
    { chave: 'energia', rotulo: 'Energia', valor: soma('energia') },
    { chave: 'maquina', rotulo: 'Máquina', valor: soma('maquina') },
    { chave: 'manutencao', rotulo: 'Manutenção', valor: soma('manutencao') },
    { chave: 'lcd', rotulo: 'Tela LCD', valor: soma('lcd') },
    { chave: 'fep', rotulo: 'Filme FEP', valor: soma('fep') },
    { chave: 'acabamento', rotulo: 'Acabamento', valor: soma('acabamento') },
    { chave: 'falhas', rotulo: 'Reserva para falhas', valor: soma('falhas') },
    { chave: 'insumos', rotulo: 'Insumos', valor: ins.total },
    { chave: 'trabalho', rotulo: 'Trabalho manual', valor: maoDeObra },
    { chave: 'fixos', rotulo: 'Custos fixos', valor: fixos },
  ]

  const imposto = n0(ctx.impostoPct)
  const markup = n0(produto.markupVarejo) || n0(ctx.markupVarejo) || 2
  const precoSugerido = total * markup
  const markupAtacado = n0(ctx.markupAtacado) || 1.5
  const precoAtacado = total * markupAtacado
  const manual = Number.isFinite(produto.precoFinalVarejo) && produto.precoFinalVarejo > 0 ? produto.precoFinalVarejo : null
  const preco = manual ?? precoSugerido
  const lucro = preco - total - preco * imposto
  const margem = preco > 0 ? lucro / preco : 0
  const canais = (ctx.canais || []).map((c) => montarPrecoCanal(preco, total, c, imposto, lucro))
  const avisos = [...new Set(pecas.flatMap((x) => x.custo.avisos))]
  const horasImpressao = pecas.reduce((s, x) => s + n0(x.peca.tempoImpressaoHoras) / unidadesNaMesa(x.peca), 0)

  return {
    pecas,
    producao,
    maoDeObra,
    insumos: ins,
    fixos,
    total,
    composicao,
    markup,
    precoSugerido,
    precoAtacado,
    markupAtacado,
    precoManual: manual,
    preco,
    imposto: preco * imposto,
    lucro,
    margem,
    canais,
    avisos,
    horasImpressao,
  }
}

/** Simula desconto por quantidade num canal (preço, receita, lucro e margem). */
export function simularDesconto(resCanal, quantidade, descontoPct, imposto) {
  const vazio = { precoUnitario: Infinity, receita: 0, custos: Infinity, lucro: -Infinity, margem: 0, difLucro: -Infinity, difMargem: 0 }
  if (!resCanal || !Number.isFinite(resCanal.preco) || quantidade < 0 || descontoPct < 0 || descontoPct > 1 || imposto >= 1) return vazio
  const canal = resCanal.canal
  const base = resCanal.custoTotal - resCanal.taxas - resCanal.imposto // custo de produção por unidade
  let precoUnitario
  let taxasUnit
  if (temFaixas(canal)) {
    precoUnitario = Math.round(resCanal.preco * (1 - descontoPct) * 100) / 100
    taxasUnit = taxasDoCanal(canal, precoUnitario).total
  } else {
    precoUnitario = resCanal.preco * (1 - descontoPct)
    taxasUnit = precoUnitario * n0(canal.taxaPct) + n0(canal.taxaFixa)
  }
  const receita = precoUnitario * quantidade
  const custos = (base + taxasUnit + precoUnitario * imposto) * quantidade
  const lucro = receita - custos
  const margem = receita > 0 ? lucro / receita : 0
  return {
    precoUnitario,
    receita,
    custos,
    lucro,
    margem,
    difLucro: lucro - resCanal.lucro * quantidade,
    difMargem: margem - resCanal.margem,
  }
}

/** Monta o contexto de cálculo a partir dos dados salvos. */
export function contextoDe(dados) {
  const cfg = dados.config || {}
  const custos = cfg.custos || {}
  const fixos = (cfg.custosFixos || []).reduce((s, f) => s + n0(f.valorMensal), 0)
  return {
    impressoras: dados.impressoras || {},
    washcures: dados.washcures || {},
    filamentos: dados.filamentos || {},
    resinas: dados.resinas || {},
    insumos: dados.insumos || {},
    tarifaKwh: n0(custos.tarifaKwh),
    custoHoraTrabalho: n0(custos.custoHoraTrabalho),
    impostoPct: n0(custos.impostoPct),
    custosFixosMensais: fixos,
    producaoMensalUnidades: n0(cfg.producaoMensalUnidades),
    markupVarejo: n0(cfg.precificacao?.markupVarejo) || 2,
    markupAtacado: n0(cfg.precificacao?.markupAtacado) || 1.5,
    canais: (cfg.canais || []).filter((c) => c.ativo !== false),
  }
}

/** Primeira mensagem de erro do cálculo, ou null. */
export function validarProduto(p, { exigirNome = false } = {}) {
  if (exigirNome && !String(p.nome || '').trim()) return 'Dê um nome ao produto antes de salvar.'
  if (String(p.nome || '').trim().length > 120) return 'O nome do produto pode ter até 120 caracteres.'
  if (!p.pecas?.length) return 'Adicione pelo menos uma peça.'
  if (p.pecas.length > 50) return 'O limite é de 50 peças por produto.'
  if ((p.insumos || []).length > 200) return 'O limite é de 200 insumos por produto.'
  const mk = n0(p.markupVarejo)
  if (!(mk >= 0.01 && mk <= 100)) return 'Use um markup entre 0,01 e 100.'
  if (p.precoFinalVarejo !== null && p.precoFinalVarejo !== undefined && !(p.precoFinalVarejo >= 0.01)) return 'Revise o preço de venda.'
  if (!(n0(p.minutosTrabalho) >= 0)) return 'Revise o tempo de trabalho manual.'
  for (const [i, peca] of p.pecas.entries()) {
    const nome = peca.nome?.trim() || `Peça ${i + 1}`
    if (!peca.impressoraId) return `${nome}: escolha a impressora.`
    if (!(Math.floor(n0(peca.unidadesPorMesa)) >= 1)) return `${nome}: informe pelo menos 1 unidade na mesa.`
    if (!(n0(peca.tempoImpressaoHoras) > 0)) return `${nome}: informe o tempo de impressão.`
    if (peca.reservaFalhasPct !== null && peca.reservaFalhasPct !== undefined && !(peca.reservaFalhasPct >= 0 && peca.reservaFalhasPct <= 1))
      return `${nome}: a reserva para falhas deve ficar entre 0% e 100%.`
    if (peca.processo === 'resina') {
      if (!peca.resinaId) return `${nome}: escolha a resina.`
      if (!(n0(peca.volumeMl) > 0)) return `${nome}: informe o volume de resina usado na mesa.`
      if (!(n0(peca.perdasPct) >= 0 && n0(peca.perdasPct) <= 1)) return `${nome}: revise a perda de resina.`
    } else {
      if (!peca.consumos?.length || peca.consumos.some((c) => !c.filamentoId || !(n0(c.gramasMesa) > 0)))
        return `${nome}: informe o filamento e o peso usado na mesa.`
      if (peca.consumos.length > 20) return `${nome}: o limite é de 20 filamentos por peça.`
      if (!(n0(peca.purgaGramas) >= 0)) return `${nome}: revise a purga.`
    }
  }
  for (const it of p.insumos || []) {
    if (!it.insumoId || !(n0(it.quantidade) > 0)) return 'Revise a quantidade dos insumos.'
  }
  return null
}
