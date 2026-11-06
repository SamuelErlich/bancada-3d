// PDFs: orçamento para o cliente (com a sua marca) e ficha de custo do cálculo (uso interno).
import { carregarJsPDF } from './files.js'
import { fmtBRL, fmtData, fmtPct, fmtHoras, fmtMarkup, fmtTelefone, hojeISO, n0, numeroDoc } from './format.js'
import { subtotalItens, totalOrcamento, validadeOrcamento, valorParcela, valorPix } from './negocio.js'
import { taxasDoCanal, temFaixas, unidadesNaMesa } from './pricing.js'

const ACENTO = [200, 68, 12]
const TINTA = [24, 30, 34]
const CINZA = [96, 106, 112]
const LINHA = [214, 220, 223]

function formatoImagem(dataUrl) {
  if (/^data:image\/png/i.test(dataUrl)) return 'PNG'
  if (/^data:image\/webp/i.test(dataUrl)) return 'WEBP'
  return 'JPEG'
}

function caberImagem(doc, dataUrl, x, y, maxW, maxH, alinhar = 'left') {
  try {
    const p = doc.getImageProperties(dataUrl)
    const r = Math.min(maxW / p.width, maxH / p.height)
    const w = p.width * r
    const h = p.height * r
    const xx = alinhar === 'right' ? x + maxW - w : alinhar === 'center' ? x + (maxW - w) / 2 : x
    doc.addImage(dataUrl, formatoImagem(dataUrl), xx, y + (maxH - h) / 2, w, h, undefined, 'FAST')
    return { w, h }
  } catch (e) {
    return null
  }
}

function rodapes(doc, texto) {
  const total = doc.getNumberOfPages()
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINHA)
    doc.setLineWidth(0.2)
    doc.line(16, H - 14, W - 16, H - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...CINZA)
    doc.text(texto, 16, H - 9)
    doc.text(`Página ${i} de ${total}`, W - 16, H - 9, { align: 'right' })
  }
}

function contatos(neg) {
  return [
    neg.documento && `CNPJ/CPF ${neg.documento}`,
    neg.whatsapp && `WhatsApp ${fmtTelefone(neg.whatsapp)}`,
    neg.email,
    neg.instagram,
    neg.cidade,
    neg.endereco,
  ].filter(Boolean)
}

/** Gera o PDF do orçamento. imagens: { [id]: dataUrl } */
export async function pdfOrcamento(orc, cfg, imagens = {}) {
  const jsPDF = await carregarJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 16
  const neg = cfg.negocio || {}
  let y = M

  // Cabeçalho
  let xTexto = M
  const logo = neg.usarLogo !== false && neg.logoId ? imagens[neg.logoId] : null
  if (logo) {
    const r = caberImagem(doc, logo, M, y, 34, 20)
    if (r) xTexto = M + r.w + 5
  }
  doc.setTextColor(...TINTA)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(neg.nome || 'Seu negócio', xTexto, y + 6, { maxWidth: W - xTexto - 70 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...CINZA)
  const linhasContato = doc.splitTextToSize(contatos(neg).join('  ·  '), W - xTexto - 72)
  doc.text(linhasContato.slice(0, 3), xTexto, y + 11.5)

  doc.setFontSize(7.5)
  doc.setTextColor(...ACENTO)
  doc.setFont('helvetica', 'bold')
  doc.text('ORÇAMENTO', W - M, y + 2, { align: 'right', charSpace: 0.6 })
  doc.setTextColor(...TINTA)
  doc.setFontSize(18)
  doc.text(`Nº ${numeroDoc(orc.numero)}`, W - M, y + 10, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...CINZA)
  doc.text(`Emitido em ${fmtData(orc.emitidoEm || hojeISO())}`, W - M, y + 15.5, { align: 'right' })
  doc.text(`Válido até ${fmtData(validadeOrcamento(orc))}`, W - M, y + 20, { align: 'right' })
  y += 27
  doc.setDrawColor(...ACENTO)
  doc.setLineWidth(0.8)
  doc.line(M, y, W - M, y)
  y += 8

  // Cliente
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...CINZA)
  doc.text('PARA', M, y, { charSpace: 0.5 })
  doc.setFontSize(12)
  doc.setTextColor(...TINTA)
  doc.text(orc.clienteNome || 'Cliente', M, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...CINZA)
  if (orc.clienteContato) doc.text(orc.clienteContato, M, y + 11)
  y += orc.clienteContato ? 18 : 14

  // Itens
  const temFoto = (orc.itens || []).some((it) => it.fotoId && imagens[it.fotoId])
  const xFoto = M
  const xProd = M + (temFoto ? 16 : 0)
  const xQtd = W - M - 62
  const xUnit = W - M - 30
  const xTot = W - M
  const cabecalhoTabela = () => {
    doc.setFillColor(243, 245, 246)
    doc.rect(M, y - 4.5, W - 2 * M, 7.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...CINZA)
    doc.text('PRODUTO', xProd + 1, y)
    doc.text('QTD', xQtd, y, { align: 'right' })
    doc.text('UNITÁRIO', xUnit, y, { align: 'right' })
    doc.text('TOTAL', xTot - 1, y, { align: 'right' })
    y += 6
  }
  cabecalhoTabela()
  for (const it of orc.itens || []) {
    const nomeLinhas = doc.splitTextToSize(it.nome || 'Produto', xQtd - xProd - 18)
    const altura = Math.max(temFoto ? 15 : 0, 5 + nomeLinhas.length * 4.6 + (it.sku ? 3.5 : 0))
    if (y + altura > H - 60) {
      doc.addPage()
      y = M + 6
      cabecalhoTabela()
    }
    const foto = it.fotoId ? imagens[it.fotoId] : null
    if (temFoto && foto) caberImagem(doc, foto, xFoto, y - 1, 13, 13, 'center')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...TINTA)
    doc.text(nomeLinhas, xProd + 1, y + 3)
    if (it.sku) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...CINZA)
      doc.text(`SKU ${it.sku}`, xProd + 1, y + 3 + nomeLinhas.length * 4.4)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...TINTA)
    doc.text(String(it.quantidade), xQtd, y + 3, { align: 'right' })
    doc.text(fmtBRL(n0(it.precoUnitario)), xUnit, y + 3, { align: 'right' })
    doc.setFont('helvetica', 'bold')
    doc.text(fmtBRL(n0(it.quantidade) * n0(it.precoUnitario)), xTot - 1, y + 3, { align: 'right' })
    y += altura
    doc.setDrawColor(...LINHA)
    doc.setLineWidth(0.2)
    doc.line(M, y - 1.5, W - M, y - 1.5)
    y += 2
  }

  // Totais
  if (y > H - 75) {
    doc.addPage()
    y = M + 6
  }
  y += 3
  const xRot = W - M - 70
  const linhaTotal = (rot, val, destaque) => {
    doc.setFont('helvetica', destaque ? 'bold' : 'normal')
    doc.setFontSize(destaque ? 12 : 9.5)
    doc.setTextColor(...(destaque ? TINTA : CINZA))
    doc.text(rot, xRot, y)
    doc.setTextColor(...TINTA)
    doc.text(val, W - M - 1, y, { align: 'right' })
    y += destaque ? 8 : 5.5
  }
  linhaTotal('Subtotal', fmtBRL(subtotalItens(orc.itens)))
  if (n0(orc.valorEnvio) > 0) linhaTotal('Envio', fmtBRL(n0(orc.valorEnvio)))
  doc.setDrawColor(...TINTA)
  doc.setLineWidth(0.4)
  doc.line(xRot, y - 3, W - M, y - 3)
  y += 1.5
  linhaTotal('Total', fmtBRL(totalOrcamento(orc)), true)
  const pix = valorPix(orc)
  const parc = valorParcela(orc)
  if (pix !== null || parc !== null) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...ACENTO)
    if (pix !== null) {
      doc.text(`No Pix: ${fmtBRL(pix)} (${n0(orc.descontoPixPercentual)}% de desconto)`, W - M - 1, y, { align: 'right' })
      y += 5
    }
    if (parc !== null) {
      doc.text(`No cartão: até ${Math.floor(n0(orc.parcelasCartao))}× de ${fmtBRL(parc)}`, W - M - 1, y, { align: 'right' })
      y += 5
    }
  }
  y += 6

  // Condições
  const cond = []
  if (n0(orc.prazoEntregaDias) > 0) cond.push(`Prazo de produção: ${Math.floor(n0(orc.prazoEntregaDias))} dias úteis após a aprovação.`)
  cond.push(`Validade: este orçamento vale até ${fmtData(validadeOrcamento(orc))}.`)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...CINZA)
  doc.text('CONDIÇÕES', M, y, { charSpace: 0.5 })
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TINTA)
  for (const c of cond) {
    doc.text(c, M, y)
    y += 5
  }
  if (orc.observacoes?.trim()) {
    y += 2
    const obs = doc.splitTextToSize(orc.observacoes.trim(), W - 2 * M)
    for (const linha of obs) {
      if (y > H - 22) {
        doc.addPage()
        y = M + 6
      }
      doc.text(linha, M, y)
      y += 4.6
    }
  }

  rodapes(doc, `${neg.nome || 'Orçamento'} · Orçamento ${numeroDoc(orc.numero)}`)
  return doc.output('blob')
}

/** Ficha de custo (um ou vários produtos). */
export async function pdfCalculos(lista, cfg) {
  const jsPDF = await carregarJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 16
  let y = M
  const garantir = (alt) => {
    if (y + alt > H - 20) {
      doc.addPage()
      y = M
    }
  }
  const titulo = (t) => {
    garantir(12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...ACENTO)
    doc.text(t.toUpperCase(), M, y, { charSpace: 0.5 })
    y += 5
  }
  const linha = (cols, opts = {}) => {
    garantir(6)
    doc.setFont('helvetica', opts.negrito ? 'bold' : 'normal')
    doc.setFontSize(opts.tam || 9)
    doc.setTextColor(...(opts.cinza ? CINZA : TINTA))
    for (const c of cols) doc.text(String(c.t), c.x, y, { align: c.a || 'left', maxWidth: c.w })
    y += opts.alt || 5.2
  }

  lista.forEach(({ produto, res }, idx) => {
    if (idx > 0) {
      doc.addPage()
      y = M
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...TINTA)
    doc.text(produto.nome || 'Sem nome', M, y + 4, { maxWidth: W - 2 * M - 40 })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...CINZA)
    doc.text(`Ficha de custo · ${fmtData(hojeISO())}`, W - M, y + 1, { align: 'right' })
    if (produto.sku) doc.text(`SKU ${produto.sku}`, W - M, y + 5.5, { align: 'right' })
    y += 11
    doc.setDrawColor(...ACENTO)
    doc.setLineWidth(0.6)
    doc.line(M, y, W - M, y)
    y += 7

    // Resumo
    const blocos = [
      ['Custo por unidade', fmtBRL(res.total)],
      [res.precoManual ? 'Preço definido' : 'Preço sugerido', fmtBRL(res.preco)],
      ['Lucro', fmtBRL(res.lucro)],
      ['Margem', fmtPct(res.margem)],
    ]
    const larg = (W - 2 * M) / 4
    blocos.forEach(([r, v], i) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...CINZA)
      doc.text(r.toUpperCase(), M + i * larg, y, { charSpace: 0.3 })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(...TINTA)
      doc.text(v, M + i * larg, y + 6.5)
    })
    y += 12
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...CINZA)
    doc.text(
      `Markup ${fmtMarkup(res.markup)} · Atacado ${fmtBRL(res.precoAtacado)} · Impressão ${fmtHoras(res.horasImpressao)} por unidade${n0(cfg.custos?.impostoPct) > 0 ? ` · Imposto ${fmtPct(n0(cfg.custos.impostoPct))}` : ''}`,
      M,
      y,
    )
    y += 9

    titulo('Peças')
    linha(
      [
        { t: 'Peça', x: M },
        { t: 'Material', x: M + 52 },
        { t: 'Mesa', x: M + 112, a: 'right' },
        { t: 'Tempo', x: M + 135, a: 'right' },
        { t: 'Custo/un.', x: W - M, a: 'right' },
      ],
      { cinza: true, tam: 7.5 },
    )
    res.pecas.forEach(({ peca, custo }, i) => {
      const mat =
        peca.processo === 'resina'
          ? `Resina · ${n0(peca.volumeMl)} ml`
          : (peca.consumos || []).map((c) => `${n0(c.gramasMesa)} g`).join(' + ') + (n0(peca.purgaGramas) ? ` + ${n0(peca.purgaGramas)} g purga` : '')
      linha([
        { t: peca.nome || `Peça ${i + 1}`, x: M, w: 50 },
        { t: mat, x: M + 52, w: 50 },
        { t: `${unidadesNaMesa(peca)} un.`, x: M + 112, a: 'right' },
        { t: fmtHoras(n0(peca.tempoImpressaoHoras)), x: M + 135, a: 'right' },
        { t: fmtBRL(custo.total), x: W - M, a: 'right' },
      ])
    })
    y += 3

    titulo('De onde vem o custo')
    res.composicao
      .filter((c) => c.valor > 0.00001)
      .forEach((c) => {
        linha([
          { t: c.rotulo, x: M },
          { t: fmtBRL(c.valor), x: W - M - 26, a: 'right' },
          { t: fmtPct(res.total > 0 ? c.valor / res.total : 0), x: W - M, a: 'right' },
        ])
      })
    linha(
      [
        { t: 'Total por unidade', x: M },
        { t: fmtBRL(res.total), x: W - M - 26, a: 'right' },
      ],
      { negrito: true },
    )
    y += 3

    if (res.insumos.linhas.length) {
      titulo('Insumos')
      res.insumos.linhas.forEach((l) => {
        linha([
          { t: l.insumo?.nome || 'Insumo removido', x: M, w: 110 },
          { t: `${n0(l.quantidade)} ${l.insumo?.unidade || ''}`, x: W - M - 30, a: 'right' },
          { t: fmtBRL(l.valor), x: W - M, a: 'right' },
        ])
      })
      y += 3
    }

    titulo('Preço por canal de venda')
    linha(
      [
        { t: 'Canal', x: M },
        { t: 'Taxa', x: M + 62 },
        { t: 'Preço', x: W - M - 52, a: 'right' },
        { t: 'Lucro', x: W - M - 24, a: 'right' },
        { t: 'Margem', x: W - M, a: 'right' },
      ],
      { cinza: true, tam: 7.5 },
    )
    res.canais.forEach((c) => {
      const tx = Number.isFinite(c.preco) ? taxasDoCanal(c.canal, c.preco) : null
      const regra = tx ? `${fmtPct(tx.taxaPct, 2)} + ${fmtBRL(tx.adicional)}${temFaixas(c.canal) ? ' (faixa)' : ''}` : 'revise as taxas'
      linha([
        { t: c.canal.nome, x: M, w: 60 },
        { t: regra, x: M + 62, w: 60 },
        { t: fmtBRL(c.preco), x: W - M - 52, a: 'right' },
        { t: fmtBRL(c.lucro), x: W - M - 24, a: 'right' },
        { t: fmtPct(c.margem), x: W - M, a: 'right' },
      ])
    })
  })
  rodapes(doc, `${cfg.negocio?.nome || 'Bancada 3D'} · Documento interno com custos — não envie ao cliente`)
  return doc.output('blob')
}
