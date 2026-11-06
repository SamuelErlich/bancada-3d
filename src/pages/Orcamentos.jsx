import { useMemo, useState } from 'react'
import { useStore, useToast, useImagem } from '../store.jsx'
import { Btn, Busca, Vazio, Modal, Numero, Texto, Check, Aviso, Pill, useConfirmar, NumInput, Miniatura, Seg, Field } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { SeletorCliente } from '../components/Cliente.jsx'
import ModalWhats from '../components/Whats.jsx'
import { precificar } from '../lib/pricing.js'
import { contem, fmtBRL, fmtData, hojeISO, n0, numeroDoc, round2, fmtTelefone } from '../lib/format.js'
import { mensagemOrcamento, statusOrcamento, subtotalItens, totalOrcamento, validadeOrcamento, valorParcela, valorPix } from '../lib/negocio.js'
import { pdfOrcamento } from '../lib/pdf.js'
import { compartilharOuBaixar } from '../lib/files.js'

// ---------- Prévia do documento ----------

function LinhaDoc({ it }) {
  const url = useImagem(it.fotoId)
  return (
    <tr>
      <td>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {url && <img src={url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />}
          <div>
            <div style={{ fontWeight: 600 }}>{it.nome}</div>
            {it.sku && <div className="doc-muted" style={{ fontSize: '0.75rem' }}>SKU {it.sku}</div>}
          </div>
        </div>
      </td>
      <td className="n">{it.quantidade}</td>
      <td className="n">{fmtBRL(n0(it.precoUnitario))}</td>
      <td className="n" style={{ fontWeight: 600 }}>
        {fmtBRL(n0(it.quantidade) * n0(it.precoUnitario))}
      </td>
    </tr>
  )
}

export function DocOrcamento({ orc, cfg }) {
  const neg = cfg.negocio || {}
  const logo = useImagem(neg.usarLogo !== false ? neg.logoId : null)
  const pix = valorPix(orc)
  const parc = valorParcela(orc)
  const contatos = [neg.documento && `CNPJ/CPF ${neg.documento}`, neg.whatsapp && `WhatsApp ${fmtTelefone(neg.whatsapp)}`, neg.email, neg.instagram, neg.cidade].filter(Boolean)
  return (
    <div className="doc-wrap">
      <div className="doc">
        <div className="doc-top">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
            {logo && <img className="doc-logo" src={logo} alt="" />}
            <div style={{ minWidth: 0 }}>
              <h2>{neg.nome || 'Nome do seu negócio'}</h2>
              <div className="doc-muted" style={{ fontSize: '0.76rem' }}>
                {contatos.join(' · ') || 'Complete seus dados em Meu negócio'}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#c8440c', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.12em' }}>ORÇAMENTO</div>
            <div style={{ fontWeight: 800, fontSize: '1.35rem', fontFamily: 'var(--font-mono)' }}>Nº {orc.numero ? numeroDoc(orc.numero) : '----'}</div>
            <div className="doc-muted" style={{ fontSize: '0.76rem' }}>
              Emitido em {fmtData(orc.emitidoEm || hojeISO())} · válido até {fmtData(validadeOrcamento(orc))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="doc-muted" style={{ fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: 700 }}>
            PARA
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{orc.clienteNome || 'Cliente'}</div>
          {orc.clienteContato && <div className="doc-muted">{orc.clienteContato}</div>}
        </div>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th className="n">Qtd</th>
              <th className="n">Unitário</th>
              <th className="n">Total</th>
            </tr>
          </thead>
          <tbody>
            {(orc.itens || []).map((it, i) => (
              <LinhaDoc key={it.produtoId || i} it={it} />
            ))}
            {!(orc.itens || []).length && (
              <tr>
                <td colSpan={4} className="doc-muted">
                  Adicione produtos ao orçamento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="doc-total">
          <div>
            <div className="kv">
              <span>Subtotal</span>
              <span>{fmtBRL(subtotalItens(orc.itens))}</span>
            </div>
            {n0(orc.valorEnvio) > 0 && (
              <div className="kv">
                <span>Envio</span>
                <span>{fmtBRL(n0(orc.valorEnvio))}</span>
              </div>
            )}
            <div className="kv doc-grand">
              <span style={{ color: '#1a1f23' }}>Total</span>
              <span>{fmtBRL(totalOrcamento(orc))}</span>
            </div>
            {pix !== null && (
              <div style={{ color: '#c8440c', fontSize: '0.82rem', textAlign: 'right' }}>
                No Pix: {fmtBRL(pix)} ({n0(orc.descontoPixPercentual)}% de desconto)
              </div>
            )}
            {parc !== null && (
              <div style={{ color: '#c8440c', fontSize: '0.82rem', textAlign: 'right' }}>
                No cartão: até {Math.floor(n0(orc.parcelasCartao))}× de {fmtBRL(parc)}
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: '0.82rem' }}>
          <div className="doc-muted" style={{ fontSize: '0.7rem', letterSpacing: '0.1em', fontWeight: 700 }}>
            CONDIÇÕES
          </div>
          {n0(orc.prazoEntregaDias) > 0 && <div>Prazo de produção: {Math.floor(n0(orc.prazoEntregaDias))} dias úteis após a aprovação.</div>}
          <div>Validade: este orçamento vale até {fmtData(validadeOrcamento(orc))}.</div>
          {orc.observacoes?.trim() && <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{orc.observacoes.trim()}</div>}
        </div>
      </div>
    </div>
  )
}

// ---------- Formulário ----------

function itemDe(produto, res, quantidade, tabela) {
  return {
    produtoId: produto.id,
    nome: produto.nome,
    sku: produto.sku || '',
    quantidade: Math.max(1, Math.floor(n0(quantidade)) || 1),
    precoUnitario: round2(tabela === 'atacado' ? res.precoAtacado : res.preco),
    custoUnitario: Number.isFinite(res.total) && res.total > 0 ? round2(res.total) : null,
    fotoId: produto.fotoId || null,
  }
}

function validar(o) {
  if (!o.clienteNome?.trim()) return 'Informe o cliente.'
  if (o.clienteNome.trim().length > 120) return 'O nome do cliente pode ter até 120 caracteres.'
  if ((o.clienteContato || '').trim().length > 200) return 'O contato pode ter até 200 caracteres.'
  if (!o.itens.length) return 'Adicione pelo menos um produto.'
  if (o.itens.length > 100) return 'O limite é de 100 produtos por orçamento.'
  if (o.itens.some((it) => !(Number.isInteger(it.quantidade) && it.quantidade >= 1 && it.quantidade <= 100000))) return 'A quantidade de cada produto deve ficar entre 1 e 100.000.'
  if (o.itens.some((it) => !(Number.isFinite(it.precoUnitario) && it.precoUnitario >= 0))) return 'Revise o preço dos produtos.'
  if (!(Number.isInteger(o.validadeDias) && o.validadeDias >= 1 && o.validadeDias <= 365)) return 'A validade deve ficar entre 1 e 365 dias.'
  if (!(n0(o.valorEnvio) >= 0)) return 'Revise o valor do envio.'
  if (o.prazoEntregaDias !== null && !(Number.isInteger(o.prazoEntregaDias) && o.prazoEntregaDias >= 1 && o.prazoEntregaDias <= 365)) return 'O prazo de produção deve ficar entre 1 e 365 dias úteis.'
  if (!(n0(o.descontoPixPercentual) >= 0 && n0(o.descontoPixPercentual) <= 100)) return 'O desconto no Pix deve ficar entre 0% e 100%.'
  if (o.parcelasCartao !== null && !(Number.isInteger(o.parcelasCartao) && o.parcelasCartao >= 1 && o.parcelasCartao <= 24)) return 'O parcelamento deve ficar entre 1 e 24 vezes.'
  if ((o.observacoes || '').length > 2000) return 'As observações podem ter até 2.000 caracteres.'
  return null
}

function FormOrcamento({ params, ir }) {
  const { dados, ctx, api } = useStore()
  const toast = useToast()
  const padrao = dados.config.orcamento || {}
  const [o, setO] = useState(() => {
    const base = params?.copiarDe ? dados.orcamentos[params.copiarDe] : null
    const cli = params?.clienteId ? dados.clientes[params.clienteId] : null
    const itens = base
      ? base.itens.map((it) => ({ ...it }))
      : (params?.itens || [])
          .map((x) => dados.produtos[x.produtoId])
          .filter(Boolean)
          .map((p) => itemDe(p, precificar(p, ctx), params.itens.find((x) => x.produtoId === p.id)?.quantidade || 1, 'varejo'))
    return {
      clienteId: base?.clienteId || cli?.id || null,
      clienteNome: base?.clienteNome || cli?.nome || '',
      clienteContato: base?.clienteContato || (cli ? cli.whatsapp || cli.email || '' : ''),
      livre: !!base && !base.clienteId,
      itens,
      valorEnvio: base?.valorEnvio ?? 0,
      validadeDias: base?.validadeDias ?? padrao.validadeDias ?? 7,
      prazoEntregaDias: base?.prazoEntregaDias ?? padrao.prazoEntregaDias ?? 5,
      descontoPixPercentual: base?.descontoPixPercentual ?? padrao.descontoPixPercentual ?? 0,
      parcelasCartao: base?.parcelasCartao ?? padrao.parcelasCartao ?? 1,
      observacoes: base?.observacoes ?? padrao.observacoes ?? '',
    }
  })
  const [tabela, setTabela] = useState('varejo')
  const [salvarPadrao, setSalvarPadrao] = useState(false)
  const [busca, setBusca] = useState('')
  const [incluirCalculos, setIncluirCalculos] = useState(false)
  const [tentou, setTentou] = useState(false)
  const set = (k, v) => setO((x) => ({ ...x, [k]: v }))
  const erro = validar(o)

  const produtos = useMemo(
    () =>
      Object.values(dados.produtos)
        .filter((p) => incluirCalculos || p.noCatalogo)
        .filter((p) => contem(p.nome, busca) || contem(p.sku, busca))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((p) => ({ p, res: precificar(p, ctx) })),
    [dados.produtos, ctx, busca, incluirCalculos],
  )

  const adicionar = (p, res) => {
    setO((x) => {
      const existe = x.itens.find((it) => it.produtoId === p.id)
      if (existe) return { ...x, itens: x.itens.map((it) => (it.produtoId === p.id ? { ...it, quantidade: it.quantidade + 1 } : it)) }
      return { ...x, itens: [...x.itens, itemDe(p, res, 1, tabela)] }
    })
  }

  const aplicarTabela = (t) => {
    setTabela(t)
    setO((x) => ({
      ...x,
      itens: x.itens.map((it) => {
        const p = dados.produtos[it.produtoId]
        if (!p) return it
        const r = precificar(p, ctx)
        return { ...it, precoUnitario: round2(t === 'atacado' ? r.precoAtacado : r.preco) }
      }),
    }))
  }

  const gerar = () => {
    setTentou(true)
    if (erro) {
      toast(erro, 'bad')
      return
    }
    const numero = api.reservarNumero('orcamento')
    const doc = api.salvar('orcamentos', {
      clienteId: o.clienteId || null,
      clienteNome: o.clienteNome.trim(),
      clienteContato: (o.clienteContato || '').trim(),
      itens: o.itens.map((it) => ({ ...it, precoUnitario: round2(it.precoUnitario) })),
      valorEnvio: round2(n0(o.valorEnvio)),
      validadeDias: o.validadeDias,
      prazoEntregaDias: o.prazoEntregaDias,
      descontoPixPercentual: n0(o.descontoPixPercentual),
      parcelasCartao: o.parcelasCartao,
      observacoes: (o.observacoes || '').trim(),
      numero,
      emitidoEm: hojeISO(),
      status: 'emitido',
      pedidoId: null,
    })
    if (salvarPadrao) {
      api.atualizarConfig((c) => ({
        ...c,
        orcamento: {
          validadeDias: o.validadeDias,
          prazoEntregaDias: o.prazoEntregaDias,
          descontoPixPercentual: n0(o.descontoPixPercentual),
          parcelasCartao: o.parcelasCartao,
          observacoes: (o.observacoes || '').trim().slice(0, 1000),
        },
      }))
    }
    toast(`Orçamento ${numeroDoc(numero)} gerado`)
    ir('orcamentos', { orcamentoId: doc.id })
  }

  const previa = { ...o, numero: dados.config.numeracao.proximoOrcamento, emitidoEm: hojeISO() }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <button type="button" className="linklike muted small" onClick={() => ir('orcamentos')} style={{ alignSelf: 'flex-start' }}>
            ← Orçamentos
          </button>
          <h1>Novo orçamento</h1>
          <p>Ao gerar, o orçamento guarda os preços deste momento. Mudanças futuras de custo não alteram o que foi enviado.</p>
        </div>
      </div>
      <div className="split">
        <div className="stack">
          <section className="card stack">
            <SeletorCliente
              valor={o}
              onMuda={(v) => setO((x) => ({ ...x, ...v }))}
              erro={tentou && !o.clienteNome?.trim() ? 'Informe o cliente.' : null}
            />
          </section>

          <section className="card stack">
            <div className="row between">
              <h3>Produtos</h3>
              <Seg
                valor={tabela}
                onMuda={aplicarTabela}
                rotulo="Tabela de preço"
                opcoes={[
                  { valor: 'varejo', rotulo: 'Venda direta' },
                  { valor: 'atacado', rotulo: 'Atacado' },
                ]}
              />
            </div>
            {o.itens.length > 0 ? (
              <div className="list">
                {o.itens.map((it, i) => (
                  <div className="list-item" key={it.produtoId} style={{ flexWrap: 'wrap' }}>
                    <Miniatura id={it.fotoId} nome={it.nome} tamanho={40} />
                    <div className="grow">
                      <div className="strong">{it.nome}</div>
                      <div className="tiny muted">{it.sku || 'sem SKU'}</div>
                    </div>
                    <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                      <Btn tamanho="sm" aria-label="Diminuir" onClick={() => set('itens', o.itens.map((x, j) => (j === i ? { ...x, quantidade: Math.max(1, x.quantidade - 1) } : x)))}>
                        −
                      </Btn>
                      <div style={{ width: 70 }}>
                        <NumInput
                          valor={it.quantidade}
                          onMuda={(v) => set('itens', o.itens.map((x, j) => (j === i ? { ...x, quantidade: Number.isFinite(v) ? Math.floor(v) : v } : x)))}
                          casas={0}
                          aria-label="Quantidade"
                        />
                      </div>
                      <Btn tamanho="sm" aria-label="Aumentar" onClick={() => set('itens', o.itens.map((x, j) => (j === i ? { ...x, quantidade: x.quantidade + 1 } : x)))}>
                        +
                      </Btn>
                    </div>
                    <div style={{ width: 120 }}>
                      <NumInput valor={it.precoUnitario} onMuda={(v) => set('itens', o.itens.map((x, j) => (j === i ? { ...x, precoUnitario: v } : x)))} prefixo="R$" casas={2} aria-label="Preço unitário" />
                    </div>
                    <span className="num strong" style={{ width: 92, textAlign: 'right' }}>
                      {fmtBRL(n0(it.quantidade) * n0(it.precoUnitario))}
                    </span>
                    <Btn variante="ghost" icone="fechar" aria-label="Remover" onClick={() => set('itens', o.itens.filter((_, j) => j !== i))} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">Escolha os produtos abaixo.</p>
            )}
            <div className="well stack-sm">
              <div className="row">
                <div className="grow">
                  <Busca valor={busca} onMuda={setBusca} placeholder="Buscar no catálogo" />
                </div>
                <Check marcado={incluirCalculos} onMuda={setIncluirCalculos}>
                  Mostrar cálculos fora do catálogo
                </Check>
              </div>
              <div className="list" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {produtos.map(({ p, res }) => (
                  <button type="button" className="list-item" key={p.id} onClick={() => adicionar(p, res)}>
                    <Miniatura id={p.fotoId} nome={p.nome} tamanho={34} />
                    <div className="grow">
                      <div className="strong small">{p.nome}</div>
                      <div className="tiny muted num">
                        {fmtBRL(tabela === 'atacado' ? res.precoAtacado : res.preco)} {p.sku ? `· ${p.sku}` : ''}
                      </div>
                    </div>
                    <Icon nome="mais2" />
                  </button>
                ))}
                {!produtos.length && <p className="small muted">Nenhum produto encontrado. Promova cálculos ao catálogo para orçá-los.</p>}
              </div>
            </div>
          </section>

          <section className="card stack">
            <h3>Envio e condições</h3>
            <div className="grid-3">
              <Numero rotulo="Envio" prefixo="R$" valor={o.valorEnvio} onMuda={(v) => set('valorEnvio', v)} casas={2} />
              <Numero rotulo="Validade" unidade="dias" valor={o.validadeDias} onMuda={(v) => set('validadeDias', Number.isFinite(v) ? Math.floor(v) : v)} casas={0} />
              <Numero rotulo="Prazo de produção" unidade="dias úteis" valor={o.prazoEntregaDias} onMuda={(v) => set('prazoEntregaDias', v === null ? null : Number.isFinite(v) ? Math.floor(v) : v)} casas={0} />
            </div>
            <div className="grid-2">
              <Numero rotulo="Desconto no Pix" unidade="%" valor={o.descontoPixPercentual} onMuda={(v) => set('descontoPixPercentual', v)} casas={2} />
              <Numero rotulo="Parcelas no cartão" unidade="×" valor={o.parcelasCartao} onMuda={(v) => set('parcelasCartao', v === null ? null : Number.isFinite(v) ? Math.floor(v) : v)} casas={0} dica="1 = à vista." />
            </div>
            <Texto rotulo="Observações" multilinha valor={o.observacoes} onMuda={(v) => set('observacoes', v)} maxLength={2000} placeholder="Ex.: cores sob encomenda, retirada no local, frete por conta do cliente." />
            <Check marcado={salvarPadrao} onMuda={setSalvarPadrao}>
              Salvar estas condições como padrão para os próximos orçamentos
            </Check>
          </section>
          {tentou && erro && <Aviso tipo="bad">{erro}</Aviso>}
          <div className="actions">
            <Btn variante="primary" icone="check" onClick={gerar}>
              Gerar orçamento
            </Btn>
            <Btn variante="ghost" onClick={() => ir('orcamentos')}>
              Cancelar
            </Btn>
          </div>
        </div>
        <div className="sticky stack-sm">
          <span className="label">Prévia do que o cliente recebe</span>
          <DocOrcamento orc={previa} cfg={dados.config} />
        </div>
      </div>
    </div>
  )
}

// ---------- Visualização ----------

function VerOrcamento({ id, ir }) {
  const { dados, api } = useStore()
  const toast = useToast()
  const confirmar = useConfirmar()
  const [whats, setWhats] = useState(false)
  const [gerando, setGerando] = useState(false)
  const o = dados.orcamentos[id]
  if (!o) {
    return (
      <div className="page">
        <Vazio titulo="Orçamento não encontrado" texto="Ele pode ter sido excluído.">
          <Btn onClick={() => ir('orcamentos')}>Voltar aos orçamentos</Btn>
        </Vazio>
      </div>
    )
  }
  const st = statusOrcamento(o)
  const cliente = o.clienteId ? dados.clientes[o.clienteId] : null
  const pedido = o.pedidoId ? dados.pedidos[o.pedidoId] : null

  const gerarPdf = async () => {
    setGerando(true)
    try {
      const ids = new Set(o.itens.map((it) => it.fotoId).filter(Boolean))
      if (dados.config.negocio?.logoId) ids.add(dados.config.negocio.logoId)
      const imagens = {}
      for (const iid of ids) {
        const url = await api.lerImagem(iid).catch(() => null)
        if (url) imagens[iid] = url
      }
      const blob = await pdfOrcamento(o, dados.config, imagens)
      const r = await compartilharOuBaixar(`orcamento-${numeroDoc(o.numero)}.pdf`, blob, `Orçamento ${numeroDoc(o.numero)}`)
      if (r === 'salvo') toast('PDF do orçamento pronto')
    } catch (e) {
      toast(e.message || 'Não foi possível gerar o PDF.', 'bad')
    } finally {
      setGerando(false)
    }
  }

  const mudarStatus = (status) => {
    api.salvar('orcamentos', { ...o, status })
    toast(status === 'recusado' ? 'Marcado como recusado' : 'Orçamento reaberto')
  }

  const excluir = async () => {
    const okk = await confirmar({ titulo: `Excluir o orçamento ${numeroDoc(o.numero)}?`, texto: 'A numeração não volta: o próximo orçamento continua na sequência.', acao: 'Excluir', perigo: true })
    if (!okk) return
    api.apagar('orcamentos', o.id)
    toast('Orçamento excluído')
    ir('orcamentos')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <button type="button" className="linklike muted small" onClick={() => ir('orcamentos')} style={{ alignSelf: 'flex-start' }}>
            ← Orçamentos
          </button>
          <div className="row">
            <h1>Orçamento {numeroDoc(o.numero)}</h1>
            <Pill tipo={st.tipo}>{st.rotulo}</Pill>
            {o.exemplo && <Pill>Exemplo</Pill>}
          </div>
          <p>
            {o.clienteNome} · {fmtBRL(totalOrcamento(o))} · válido até {fmtData(validadeOrcamento(o))}
          </p>
        </div>
        <div className="actions">
          <Btn variante="primary" icone="compartilhar" onClick={gerarPdf} disabled={gerando}>
            {gerando ? 'Gerando PDF…' : 'Compartilhar ou salvar PDF'}
          </Btn>
          <Btn icone="whats" onClick={() => setWhats(true)}>
            Mensagem no WhatsApp
          </Btn>
        </div>
      </div>

      <div className="split">
        <DocOrcamento orc={o} cfg={dados.config} />
        <div className="stack">
          <section className="card stack">
            <h3>Próximo passo</h3>
            {pedido ? (
              <>
                <p className="small">Este orçamento virou o pedido #{numeroDoc(pedido.numero)}. Cada orçamento gera um único pedido.</p>
                <Btn variante="primary" icone="pedido" onClick={() => ir('pedidos', { pedidoId: pedido.id })}>
                  Abrir pedido #{numeroDoc(pedido.numero)}
                </Btn>
              </>
            ) : st.valor === 'recusado' ? (
              <>
                <p className="small muted">O cliente recusou. Você pode reabrir se ele mudar de ideia.</p>
                <Btn icone="reabrir" onClick={() => mudarStatus('emitido')}>
                  Reabrir orçamento
                </Btn>
              </>
            ) : (
              <>
                <p className="small muted">Quando o cliente aprovar, transforme em pedido sem recalcular os preços.</p>
                <Btn variante="primary" icone="check" onClick={() => ir('pedidos', { novo: true, orcamentoId: o.id })}>
                  Cliente aprovou: criar pedido
                </Btn>
                <Btn variante="ghost" icone="cancelar" onClick={() => mudarStatus('recusado')}>
                  Marcar como recusado
                </Btn>
              </>
            )}
            {st.valor === 'vencido' && !pedido && <Aviso tipo="warn">A validade passou. Confira os preços antes de aceitar, ou duplique para gerar um novo.</Aviso>}
          </section>
          <section className="card stack-sm">
            <h3>Cliente</h3>
            <p className="strong">{o.clienteNome}</p>
            {o.clienteContato && <p className="small muted">{o.clienteContato}</p>}
            {cliente ? (
              <button type="button" className="linklike small" style={{ alignSelf: 'flex-start' }} onClick={() => ir('clientes', { clienteId: cliente.id })}>
                Ver histórico do cliente
              </button>
            ) : (
              <p className="tiny muted">Cliente não cadastrado.</p>
            )}
          </section>
          <div className="actions">
            <Btn icone="copiar" onClick={() => ir('orcamentos', { novo: true, copiarDe: o.id })}>
              Duplicar como novo
            </Btn>
            {!pedido && (
              <Btn variante="ghost" icone="lixo" onClick={excluir}>
                Excluir
              </Btn>
            )}
          </div>
        </div>
      </div>
      <ModalWhats
        aberto={whats}
        onFechar={() => setWhats(false)}
        titulo={`Orçamento ${numeroDoc(o.numero)} no WhatsApp`}
        numero={cliente?.whatsapp || (/\d{8,}/.test((o.clienteContato || '').replace(/\D/g, '')) ? o.clienteContato : '')}
        mensagem={mensagemOrcamento(o, dados.config)}
        aviso="Dica: gere o PDF antes e anexe na conversa. No celular, o botão de PDF já abre o compartilhamento."
      />
    </div>
  )
}

// ---------- Lista ----------

function ModalNumeracao({ aberto, onFechar, tipo }) {
  const { dados, api } = useStore()
  const toast = useToast()
  const chave = tipo === 'pedido' ? 'proximoPedido' : 'proximoOrcamento'
  const atual = dados.config.numeracao[chave]
  const [valor, setValor] = useState(atual)
  const valido = Number.isInteger(valor) && valor >= atual && valor <= 999999
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={tipo === 'pedido' ? 'Numeração dos pedidos' : 'Numeração dos orçamentos'}
      subtitulo="Use para continuar a sequência que você já tinha. A mudança vale só para os próximos; a sequência só avança."
      rodape={
        <>
          <Btn onClick={onFechar}>Cancelar</Btn>
          <Btn
            variante="primary"
            disabled={!valido}
            onClick={() => {
              api.atualizarConfig((c) => ({ ...c, numeracao: { ...c.numeracao, [chave]: valor } }))
              toast('Numeração salva')
              onFechar()
            }}
          >
            Salvar numeração
          </Btn>
        </>
      }
    >
      <Numero
        rotulo={tipo === 'pedido' ? 'Próximo número de pedido' : 'Próximo número de orçamento'}
        valor={valor}
        onMuda={(v) => setValor(Number.isFinite(v) ? Math.floor(v) : v)}
        casas={0}
        erro={!valido ? `Use um número a partir de ${atual}.` : null}
        dica={`Se o último foi ${Math.max(0, atual - 1)}, o próximo é ${atual}.`}
      />
    </Modal>
  )
}

export { ModalNumeracao }

export default function Orcamentos({ params, ir }) {
  const { dados } = useStore()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [numeracao, setNumeracao] = useState(false)
  if (params?.novo) return <FormOrcamento params={params} ir={ir} />
  if (params?.orcamentoId) return <VerOrcamento id={params.orcamentoId} ir={ir} />

  const todos = Object.values(dados.orcamentos).sort((a, b) => n0(b.numero) - n0(a.numero))
  const lista = todos.filter((o) => (filtro === 'todos' || statusOrcamento(o).valor === filtro) && (contem(o.clienteNome, busca) || String(o.numero).includes(busca.replace(/^0+/, '')) || o.itens.some((it) => contem(it.nome, busca))))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Vendas</span>
          <h1>Orçamentos</h1>
          <p>Itens do catálogo viram um PDF com a sua marca, pronto para mandar ao cliente.</p>
        </div>
        <div className="actions">
          <Btn icone="editar" onClick={() => setNumeracao(true)}>
            Numeração
          </Btn>
          <Btn variante="primary" icone="mais2" onClick={() => ir('orcamentos', { novo: true })}>
            Novo orçamento
          </Btn>
        </div>
      </div>
      {!todos.length ? (
        <Vazio titulo="Nenhum orçamento ainda" texto="Escolha o cliente e os produtos do catálogo. O preço vem do cálculo e fica registrado no documento.">
          <Btn variante="primary" icone="mais2" onClick={() => ir('orcamentos', { novo: true })}>
            Criar orçamento
          </Btn>
        </Vazio>
      ) : (
        <>
          <div className="row">
            <div className="grow" style={{ maxWidth: 420 }}>
              <Busca valor={busca} onMuda={setBusca} placeholder="Cliente, produto ou número" />
            </div>
            <div className="chip-row">
              {[
                ['todos', 'Todos'],
                ['emitido', 'Aguardando'],
                ['aprovado', 'Aprovados'],
                ['vencido', 'Vencidos'],
                ['recusado', 'Recusados'],
              ].map(([v, r]) => (
                <button key={v} type="button" className="chip" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Cliente</th>
                  <th>Itens</th>
                  <th className="num">Total</th>
                  <th>Situação</th>
                  <th>Emitido</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => {
                  const st = statusOrcamento(o)
                  return (
                    <tr key={o.id} className="clickable" onClick={() => ir('orcamentos', { orcamentoId: o.id })}>
                      <td className="num strong">{numeroDoc(o.numero)}</td>
                      <td>{o.clienteNome}</td>
                      <td className="small muted">{o.itens.map((it) => `${it.quantidade}× ${it.nome}`).join(', ')}</td>
                      <td className="num">{fmtBRL(totalOrcamento(o))}</td>
                      <td>
                        <Pill tipo={st.tipo}>{st.rotulo}</Pill>
                      </td>
                      <td className="small nowrap">{fmtData(o.emitidoEm)}</td>
                    </tr>
                  )
                })}
                {!lista.length && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Nada encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {numeracao && <ModalNumeracao aberto onFechar={() => setNumeracao(false)} tipo="orcamento" />}
    </div>
  )
}
