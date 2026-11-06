// Exportação para Excel (.xlsx).
import { carregarXLSX } from './files.js'
import { fmtData, n0, numeroDoc } from './format.js'
import { recebidoPedido, rotuloEtapa, saldoPedido, statusOrcamento, totalOrcamento, etapaVisivel } from './negocio.js'

const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null)

function larguras(linhas) {
  if (!linhas.length) return []
  return Object.keys(linhas[0]).map((k) => ({ wch: Math.min(48, Math.max(k.length + 2, ...linhas.map((l) => String(l[k] ?? '').length + 1))) }))
}

async function livro(abas) {
  const XLSX = await carregarXLSX()
  const wb = XLSX.utils.book_new()
  for (const [nome, linhas] of abas) {
    const ws = XLSX.utils.json_to_sheet(linhas.length ? linhas : [{ Aviso: 'Sem registros' }])
    ws['!cols'] = larguras(linhas)
    XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31))
  }
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export async function xlsxCalculos(lista) {
  const linhas = lista.map(({ produto, res }) => {
    const base = {
      Produto: produto.nome || '',
      SKU: produto.sku || '',
      'No catálogo': produto.noCatalogo ? 'Sim' : 'Não',
      'Peças': (produto.pecas || []).length,
      'Custo por unidade': r2(res.total),
    }
    for (const c of res.composicao) base[c.rotulo] = r2(c.valor)
    Object.assign(base, {
      Markup: r2(res.markup),
      'Preço manual': res.precoManual ? 'Sim' : 'Não',
      'Preço venda direta': r2(res.preco),
      'Preço atacado': r2(res.precoAtacado),
      Lucro: r2(res.lucro),
      'Margem (%)': r2(res.margem * 100),
    })
    for (const c of res.canais) base[`Preço ${c.canal.nome}`] = r2(c.preco)
    return base
  })
  return livro([['Cálculos', linhas]])
}

export async function xlsxClientesPedidos(dados) {
  const clientes = Object.values(dados.clientes)
  const pedidos = Object.values(dados.pedidos).sort((a, b) => n0(a.numero) - n0(b.numero))
  const orcamentos = Object.values(dados.orcamentos).sort((a, b) => n0(a.numero) - n0(b.numero))
  const linhasClientes = clientes.map((c) => {
    const ps = pedidos.filter((p) => p.clienteId === c.id && !p.cancelado)
    return {
      Nome: c.nome,
      WhatsApp: c.whatsapp || '',
      'E-mail': c.email || '',
      Observação: c.observacao || '',
      Situação: c.arquivado ? 'Arquivado' : 'Ativo',
      Pedidos: ps.length,
      'Total comprado': r2(ps.reduce((s, p) => s + n0(p.total), 0)),
    }
  })
  const linhasPedidos = pedidos.map((p) => ({
    Pedido: numeroDoc(p.numero),
    Cliente: p.clienteNome || '',
    Etapa: rotuloEtapa(etapaVisivel(p)),
    Itens: (p.itens || []).map((it) => `${it.quantidade}x ${it.nome}`).join('; '),
    Envio: r2(n0(p.valorEnvio)),
    Desconto: r2(n0(p.desconto)),
    Total: r2(n0(p.total)),
    Recebido: r2(recebidoPedido(p)),
    'A receber': r2(saldoPedido(p)),
    Prazo: p.prazo ? fmtData(p.prazo) : '',
    Criado: p.criadoEm ? new Date(p.criadoEm).toLocaleDateString('pt-BR') : '',
  }))
  const linhasRec = pedidos.flatMap((p) => [
    ...(p.recebimentos || []).map((r) => ({ Pedido: numeroDoc(p.numero), Cliente: p.clienteNome, Tipo: 'Recebimento', Data: fmtData(r.data), Meio: r.meio, Valor: r2(n0(r.valor)), Observação: r.obs || '' })),
    ...(p.devolucoes || []).map((r) => ({ Pedido: numeroDoc(p.numero), Cliente: p.clienteNome, Tipo: 'Devolução', Data: fmtData(r.data), Meio: r.meio, Valor: r2(-n0(r.valor)), Observação: r.motivo || '' })),
  ])
  const linhasOrc = orcamentos.map((o) => ({
    Orçamento: numeroDoc(o.numero),
    Cliente: o.clienteNome || '',
    Situação: statusOrcamento(o).rotulo,
    Itens: (o.itens || []).map((it) => `${it.quantidade}x ${it.nome}`).join('; '),
    Total: r2(totalOrcamento(o)),
    Emitido: fmtData(o.emitidoEm),
  }))
  return livro([
    ['Clientes', linhasClientes],
    ['Pedidos', linhasPedidos],
    ['Recebimentos', linhasRec],
    ['Orçamentos', linhasOrc],
  ])
}
