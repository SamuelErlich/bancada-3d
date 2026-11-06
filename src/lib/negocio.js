// Regras de orçamentos, pedidos, clientes, SKU e mensagens de WhatsApp.
import { addDias, addDiasUteis, diffDias, fmtBRL, fmtData, hojeISO, n0, normalizar, numeroDoc, round2 } from './format.js'
import { ETAPAS } from './defaults.js'

// ---------- Orçamentos ----------

export function subtotalItens(itens) {
  return round2((itens || []).reduce((s, it) => s + n0(it.quantidade) * n0(it.precoUnitario), 0))
}

export function totalOrcamento(o) {
  return round2(subtotalItens(o.itens) + n0(o.valorEnvio))
}

export function validadeOrcamento(o) {
  return addDias(o.emitidoEm || hojeISO(), Math.max(1, Math.floor(n0(o.validadeDias) || 7)))
}

export function statusOrcamento(o) {
  if (o.status === 'aprovado') return { valor: 'aprovado', rotulo: 'Aprovado', tipo: 'ok' }
  if (o.status === 'recusado') return { valor: 'recusado', rotulo: 'Recusado', tipo: 'bad' }
  if (diffDias(hojeISO(), validadeOrcamento(o)) > 0) return { valor: 'vencido', rotulo: 'Vencido', tipo: 'warn' }
  return { valor: 'emitido', rotulo: 'Aguardando resposta', tipo: 'info' }
}

export function valorPix(o) {
  const pct = n0(o.descontoPixPercentual) / 100
  return pct > 0 ? round2(totalOrcamento(o) * (1 - pct)) : null
}

export function valorParcela(o) {
  const p = Math.floor(n0(o.parcelasCartao))
  return p > 1 ? round2(totalOrcamento(o) / p) : null
}

export function rotuloOrcamento(o) {
  return `Orçamento ${numeroDoc(o.numero)}`
}

// ---------- Pedidos ----------

export function subtotalPedido(p) {
  return subtotalItens(p.itens)
}

export function calcularTotalPedido(itens, envio, desconto) {
  return round2(Math.max(0, subtotalItens(itens) + n0(envio) - n0(desconto)))
}

export function recebidoPedido(p) {
  const rec = (p.recebimentos || []).reduce((s, r) => s + n0(r.valor), 0)
  const dev = (p.devolucoes || []).reduce((s, r) => s + n0(r.valor), 0)
  return round2(rec - dev)
}

export function saldoPedido(p) {
  if (p.cancelado) return 0
  return round2(Math.max(0, n0(p.total) - recebidoPedido(p)))
}

export function atrasado(p) {
  if (p.cancelado || p.etapa === 'entregue' || !p.prazo) return false
  return diffDias(hojeISO(), p.prazo) > 0
}

export function emAndamento(p) {
  return !p.cancelado && p.etapa !== 'entregue'
}

export function rotuloEtapa(valor) {
  if (valor === 'cancelado') return 'Cancelado'
  return ETAPAS.find((e) => e.valor === valor)?.rotulo || valor
}

export function etapaVisivel(p) {
  return p.cancelado ? 'cancelado' : p.etapa
}

export function proximaEtapa(etapa) {
  const i = ETAPAS.findIndex((e) => e.valor === etapa)
  return i >= 0 && i < ETAPAS.length - 1 ? ETAPAS[i + 1].valor : null
}

export function indiceEtapa(etapa) {
  return ETAPAS.findIndex((e) => e.valor === etapa)
}

export function resumoItens(itens, max = 2) {
  const lista = (itens || []).map((it) => `${it.quantidade}× ${it.nome}`)
  if (lista.length <= max) return lista.join(', ')
  return lista.slice(0, max).join(', ') + ` e mais ${lista.length - max}`
}

// ---------- Mensagens prontas ----------

function assinatura(cfg) {
  const nome = cfg?.negocio?.nome?.trim()
  return nome ? `\n\n${nome}` : ''
}

function primeiroNome(nome) {
  return String(nome || '').trim().split(/\s+/)[0] || ''
}

export function mensagemPedido(p, cfg) {
  const oi = `Olá, ${primeiroNome(p.clienteNome)}!`
  const n = `#${numeroDoc(p.numero)}`
  const itens = (p.itens || []).map((it) => `• ${it.quantidade}× ${it.nome}`).join('\n')
  const saldo = saldoPedido(p)
  const restante = saldo > 0 ? `\nValor em aberto: ${fmtBRL(saldo)}.` : ''
  if (p.cancelado) {
    return `${oi} Conforme combinado, o pedido ${n} foi cancelado. Se quiser retomar ou fazer outro pedido, é só me chamar.${assinatura(cfg)}`
  }
  switch (p.etapa) {
    case 'em_preparo':
      return `${oi} Seu pedido ${n} já está em produção.\n${itens}\n${p.prazo ? `Previsão: ${fmtData(p.prazo)}.` : ''} Assim que ficar pronto eu te aviso.${assinatura(cfg)}`
    case 'pronto':
      return `${oi} Seu pedido ${n} está pronto!\n${itens}${restante}\nVamos combinar a retirada ou o envio?${assinatura(cfg)}`
    case 'entregue':
      return `${oi} O pedido ${n} foi entregue. Muito obrigado pela compra! Se puder, me mande uma foto da peça no lugar dela, eu adoro ver.${assinatura(cfg)}`
    default:
      return `${oi} Seu pedido ${n} está confirmado.\n${itens}\nTotal: ${fmtBRL(n0(p.total))}.${restante}${p.prazo ? `\nPrazo previsto: ${fmtData(p.prazo)}.` : ''}\nQualquer dúvida, estou à disposição.${assinatura(cfg)}`
  }
}

export function mensagemOrcamento(o, cfg) {
  const oi = `Olá, ${primeiroNome(o.clienteNome)}!`
  const itens = (o.itens || []).map((it) => `• ${it.quantidade}× ${it.nome}: ${fmtBRL(n0(it.quantidade) * n0(it.precoUnitario))}`).join('\n')
  const linhas = [`${oi} Segue o orçamento ${numeroDoc(o.numero)}:`, itens]
  if (n0(o.valorEnvio) > 0) linhas.push(`Envio: ${fmtBRL(n0(o.valorEnvio))}`)
  linhas.push(`Total: ${fmtBRL(totalOrcamento(o))}`)
  const pix = valorPix(o)
  if (pix !== null) linhas.push(`No Pix: ${fmtBRL(pix)} (${n0(o.descontoPixPercentual)}% de desconto)`)
  const parc = valorParcela(o)
  if (parc !== null) linhas.push(`No cartão: até ${Math.floor(n0(o.parcelasCartao))}× de ${fmtBRL(parc)}`)
  if (n0(o.prazoEntregaDias) > 0) linhas.push(`Prazo de produção: ${Math.floor(n0(o.prazoEntregaDias))} dias úteis após a aprovação`)
  linhas.push(`Válido até ${fmtData(validadeOrcamento(o))}.`)
  return linhas.join('\n') + assinatura(cfg)
}

export function prazoSugerido(diasUteis) {
  return addDiasUteis(hojeISO(), Math.max(1, Math.floor(n0(diasUteis) || 5)))
}

// ---------- SKU ----------

function letras(s, n) {
  return normalizar(s)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
}

export function prefixoSku(cfg) {
  const manual = String(cfg?.sku?.prefixo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (manual) return manual.slice(0, 6)
  const palavras = letras(cfg?.negocio?.nome || '').filter((w) => !['DE', 'DA', 'DO', 'E', 'DAS', 'DOS'].includes(w))
  if (!palavras.length) return 'B3D'
  if (palavras.length === 1) return palavras[0].slice(0, 3)
  return palavras.slice(0, 3).map((w) => w[0]).join('')
}

export function sugerirSku(produto, cfg, existentes) {
  const pre = prefixoSku(cfg)
  const palavras = letras(produto?.nome || '').filter((w) => w.length > 2)
  const meio = (palavras[0] || 'PRD').slice(0, 3).padEnd(3, 'X')
  const usados = new Set((existentes || []).map((s) => String(s || '').toUpperCase()))
  for (let i = 1; i < 10000; i++) {
    const cand = `${pre}-${meio}-${String(i).padStart(3, '0')}`
    if (!usados.has(cand)) return cand
  }
  return `${pre}-${meio}-${Date.now() % 100000}`
}

export function skuValido(s) {
  return /^[A-Z0-9][A-Z0-9-]{1,39}$/.test(String(s || ''))
}
