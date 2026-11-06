import { useMemo, useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Busca, Vazio, Modal, Numero, Texto, Check, Aviso, Pill, Selecao, Seg, NumInput, Miniatura, Field, useConfirmar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { SeletorCliente } from '../components/Cliente.jsx'
import ModalWhats from '../components/Whats.jsx'
import { ModalNumeracao } from './Orcamentos.jsx'
import { precificar } from '../lib/pricing.js'
import { ETAPAS, MEIOS_PAGAMENTO } from '../lib/defaults.js'
import { contem, diffDias, fmtBRL, fmtData, fmtDataHora, hojeISO, n0, novoId, numeroDoc, round2 } from '../lib/format.js'
import {
  atrasado,
  calcularTotalPedido,
  emAndamento,
  etapaVisivel,
  indiceEtapa,
  mensagemPedido,
  prazoSugerido,
  proximaEtapa,
  recebidoPedido,
  resumoItens,
  rotuloEtapa,
  saldoPedido,
  statusOrcamento,
  subtotalItens,
  totalOrcamento,
} from '../lib/negocio.js'

function PillEtapa({ p }) {
  const e = etapaVisivel(p)
  return <span className={'pill etapa-' + e}>{rotuloEtapa(e)}</span>
}

function registro(tipo, extra = {}) {
  return { id: novoId(), tipo, em: Date.now(), ...extra }
}

// ---------- Novo pedido ----------

function FormPedido({ params, ir }) {
  const { dados, ctx, api } = useStore()
  const toast = useToast()
  const disponiveis = Object.values(dados.orcamentos)
    .filter((o) => !o.pedidoId && statusOrcamento(o).valor !== 'recusado')
    .sort((a, b) => n0(b.numero) - n0(a.numero))
  const [origem, setOrigem] = useState(params?.orcamentoId ? 'orcamento' : params?.origem || (disponiveis.length ? 'orcamento' : 'catalogo'))
  // Custo de uma unidade no momento da venda (vai para o lucro estimado da planilha financeira).
  const custoAtual = (produtoId) => {
    const p = dados.produtos[produtoId]
    if (!p) return null
    try {
      const t = precificar(p, ctx).total
      return Number.isFinite(t) && t > 0 ? round2(t) : null
    } catch (e) {
      return null
    }
  }
  const montarDeOrcamento = (orcId) => {
    const o = dados.orcamentos[orcId]
    if (!o) return null
    const cli = o.clienteId ? dados.clientes[o.clienteId] : null
    return {
      orcamentoId: o.id,
      clienteId: cli ? cli.id : null,
      clienteNome: cli ? cli.nome : o.clienteNome,
      clienteContato: cli ? cli.whatsapp || cli.email || '' : o.clienteContato,
      itens: o.itens.map((it) => ({ ...it, custoUnitario: Number.isFinite(it.custoUnitario) ? it.custoUnitario : custoAtual(it.produtoId) })),
      valorEnvio: n0(o.valorEnvio),
      desconto: 0,
      prazo: prazoSugerido(o.prazoEntregaDias || dados.config.orcamento?.prazoEntregaDias),
    }
  }
  const [f, setF] = useState(() => {
    const base = {
      orcamentoId: null,
      clienteId: null,
      clienteNome: '',
      clienteContato: '',
      itens: [],
      valorEnvio: 0,
      desconto: 0,
      prazo: prazoSugerido(dados.config.orcamento?.prazoEntregaDias),
      observacoes: '',
    }
    if (params?.clienteId && dados.clientes[params.clienteId]) {
      const c = dados.clientes[params.clienteId]
      Object.assign(base, { clienteId: c.id, clienteNome: c.nome, clienteContato: c.whatsapp || '' })
    }
    if (params?.orcamentoId) return { ...base, ...montarDeOrcamento(params.orcamentoId) }
    return base
  })
  const [conferido, setConferido] = useState(false)
  const [busca, setBusca] = useState('')
  const [tentou, setTentou] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const total = calcularTotalPedido(f.itens, f.valorEnvio, f.desconto)

  const produtos = useMemo(
    () =>
      Object.values(dados.produtos)
        .filter((p) => p.noCatalogo)
        .filter((p) => contem(p.nome, busca) || contem(p.sku, busca))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((p) => ({ p, res: precificar(p, ctx) })),
    [dados.produtos, ctx, busca],
  )

  const erro = (() => {
    if (origem === 'orcamento' && !f.orcamentoId) return 'Escolha o orçamento aprovado.'
    if (!f.clienteId) return 'Escolha o cliente (ou cadastre aqui mesmo).'
    if (!f.itens.length) return 'Adicione pelo menos um produto.'
    if (f.itens.some((it) => !(Number.isInteger(it.quantidade) && it.quantidade >= 1))) return 'Revise as quantidades.'
    if (f.itens.some((it) => !(Number.isFinite(it.precoUnitario) && it.precoUnitario >= 0))) return 'Revise os preços.'
    if (!(n0(f.valorEnvio) >= 0) || !(n0(f.desconto) >= 0)) return 'Revise envio e desconto.'
    if (n0(f.desconto) > subtotalItens(f.itens) + n0(f.valorEnvio)) return 'O desconto passa do valor do pedido.'
    if (!conferido) return 'Marque a confirmação de que revisou o pedido.'
    return null
  })()

  const confirmar = () => {
    setTentou(true)
    if (erro) {
      toast(erro, 'bad')
      return
    }
    const numero = api.reservarNumero('pedido')
    const doc = api.salvar('pedidos', {
      numero,
      origem,
      orcamentoId: origem === 'orcamento' ? f.orcamentoId : null,
      clienteId: f.clienteId,
      clienteNome: f.clienteNome,
      itens: f.itens.map((it) => ({ ...it, precoUnitario: round2(it.precoUnitario) })),
      valorEnvio: round2(n0(f.valorEnvio)),
      desconto: round2(n0(f.desconto)),
      total,
      prazo: f.prazo || null,
      etapa: 'confirmado',
      cancelado: false,
      recebimentos: [],
      devolucoes: [],
      observacoes: (f.observacoes || '').trim(),
      historico: [registro('criado', { origem })],
    })
    if (origem === 'orcamento' && dados.orcamentos[f.orcamentoId]) {
      api.salvar('orcamentos', { ...dados.orcamentos[f.orcamentoId], status: 'aprovado', pedidoId: doc.id })
    }
    toast(`Pedido #${numeroDoc(numero)} confirmado`)
    ir('pedidos', { pedidoId: doc.id })
  }

  const adicionar = (p, res) =>
    setF((x) => {
      const existe = x.itens.find((it) => it.produtoId === p.id)
      if (existe) return { ...x, itens: x.itens.map((it) => (it.produtoId === p.id ? { ...it, quantidade: it.quantidade + 1 } : it)) }
      return {
        ...x,
        itens: [
          ...x.itens,
          {
            produtoId: p.id,
            nome: p.nome,
            sku: p.sku || '',
            quantidade: 1,
            precoUnitario: round2(res.preco),
            custoUnitario: Number.isFinite(res.total) && res.total > 0 ? round2(res.total) : null,
            fotoId: p.fotoId || null,
          },
        ],
      }
    })

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <button type="button" className="linklike muted small" onClick={() => ir('pedidos')} style={{ alignSelf: 'flex-start' }}>
            ← Pedidos
          </button>
          <h1>Novo pedido</h1>
          <p>Os preços vêm do orçamento ou do catálogo, sem recalcular os custos. Confira o que foi realmente combinado.</p>
        </div>
      </div>
      <div className="split">
        <div className="stack">
          <section className="card stack">
            <Field rotulo="Origem do pedido">
              <Seg
                valor={origem}
                onMuda={(v) => {
                  setOrigem(v)
                  setF((x) => ({ ...x, orcamentoId: null, itens: v === 'catalogo' ? x.itens : [] }))
                }}
                rotulo="Origem"
                opcoes={[
                  { valor: 'orcamento', rotulo: 'De um orçamento' },
                  { valor: 'catalogo', rotulo: 'Do catálogo' },
                ]}
              />
            </Field>
            {origem === 'orcamento' ? (
              disponiveis.length ? (
                <Selecao
                  rotulo="Orçamento aprovado pelo cliente"
                  valor={f.orcamentoId || ''}
                  vazio="Escolha o orçamento"
                  onMuda={(v) => {
                    const m = montarDeOrcamento(v)
                    if (m) setF((x) => ({ ...x, ...m }))
                  }}
                  opcoes={disponiveis.map((o) => ({ valor: o.id, rotulo: `${numeroDoc(o.numero)} · ${o.clienteNome} · ${fmtBRL(totalOrcamento(o))}${statusOrcamento(o).valor === 'vencido' ? ' (vencido)' : ''}` }))}
                  dica="Cada orçamento gera um único pedido."
                />
              ) : (
                <Aviso>Nenhum orçamento aguardando. Crie o pedido direto do catálogo, por exemplo para uma venda fechada no WhatsApp.</Aviso>
              )
            ) : null}
            <SeletorCliente
              valor={f}
              permitirLivre={false}
              onMuda={(v) => setF((x) => ({ ...x, clienteId: v.clienteId, clienteNome: v.clienteNome, clienteContato: v.clienteContato }))}
              erro={tentou && !f.clienteId ? 'Escolha o cliente.' : null}
            />
            {origem === 'orcamento' && f.orcamentoId && !f.clienteId && (
              <Aviso tipo="warn">
                O orçamento foi feito para “{dados.orcamentos[f.orcamentoId]?.clienteNome}”, que não está no cadastro. Use “Cadastrar cliente aqui” para acompanhar o histórico.
              </Aviso>
            )}
          </section>

          <section className="card stack">
            <h3>Itens</h3>
            {f.itens.length ? (
              <div className="list">
                {f.itens.map((it, i) => (
                  <div className="list-item" key={it.produtoId || i} style={{ flexWrap: 'wrap' }}>
                    <Miniatura id={it.fotoId} nome={it.nome} tamanho={40} />
                    <div className="grow">
                      <div className="strong">{it.nome}</div>
                      <div className="tiny muted">{it.sku || 'sem SKU'}</div>
                    </div>
                    <div style={{ width: 80 }}>
                      <NumInput valor={it.quantidade} onMuda={(v) => set('itens', f.itens.map((x, j) => (j === i ? { ...x, quantidade: Number.isFinite(v) ? Math.floor(v) : v } : x)))} unidade="un." casas={0} aria-label="Quantidade" />
                    </div>
                    <div style={{ width: 120 }}>
                      <NumInput valor={it.precoUnitario} onMuda={(v) => set('itens', f.itens.map((x, j) => (j === i ? { ...x, precoUnitario: v } : x)))} prefixo="R$" casas={2} aria-label="Preço unitário" />
                    </div>
                    <span className="num strong" style={{ width: 90, textAlign: 'right' }}>
                      {fmtBRL(n0(it.quantidade) * n0(it.precoUnitario))}
                    </span>
                    <Btn variante="ghost" icone="fechar" aria-label="Remover" onClick={() => set('itens', f.itens.filter((_, j) => j !== i))} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="small muted">{origem === 'orcamento' ? 'Escolha o orçamento para trazer os itens.' : 'Adicione os produtos abaixo.'}</p>
            )}
            {origem === 'catalogo' && (
              <div className="well stack-sm">
                <Busca valor={busca} onMuda={setBusca} placeholder="Buscar no catálogo" />
                <div className="list" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {produtos.map(({ p, res }) => (
                    <button type="button" className="list-item" key={p.id} onClick={() => adicionar(p, res)}>
                      <Miniatura id={p.fotoId} nome={p.nome} tamanho={34} />
                      <div className="grow">
                        <div className="strong small">{p.nome}</div>
                        <div className="tiny muted num">{fmtBRL(res.preco)}</div>
                      </div>
                      <Icon nome="mais2" />
                    </button>
                  ))}
                  {!produtos.length && <p className="small muted">Nenhum produto no catálogo.</p>}
                </div>
              </div>
            )}
          </section>

          <section className="card stack">
            <h3>Envio, desconto e prazo</h3>
            <div className="grid-3">
              <Numero rotulo="Envio" prefixo="R$" valor={f.valorEnvio} onMuda={(v) => set('valorEnvio', v)} casas={2} />
              <Numero rotulo="Desconto combinado" prefixo="R$" valor={f.desconto} onMuda={(v) => set('desconto', v)} casas={2} />
              <Field rotulo="Prazo de entrega" htmlFor="ped-prazo">
                <input id="ped-prazo" type="date" className="input" value={f.prazo || ''} onChange={(e) => set('prazo', e.target.value)} />
              </Field>
            </div>
            <Texto rotulo="Observações do pedido" multilinha valor={f.observacoes} onMuda={(v) => set('observacoes', v)} maxLength={1000} />
          </section>
        </div>
        <div className="sticky stack">
          <section className="card stack-sm">
            <h3>Resumo</h3>
            <div className="kv">
              <span>Itens</span>
              <span>{fmtBRL(subtotalItens(f.itens))}</span>
            </div>
            <div className="kv">
              <span>Envio</span>
              <span>{fmtBRL(n0(f.valorEnvio))}</span>
            </div>
            <div className="kv">
              <span>Desconto</span>
              <span>− {fmtBRL(n0(f.desconto))}</span>
            </div>
            <div className="kv" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              <span>Total</span>
              <span>{fmtBRL(total)}</span>
            </div>
            <div className="kv">
              <span>Prazo</span>
              <span>{f.prazo ? fmtData(f.prazo) : 'sem prazo'}</span>
            </div>
            <Check marcado={conferido} onMuda={setConferido}>
              Conferi itens, valores, envio, desconto e prazo com o cliente.
            </Check>
            {tentou && erro && <Aviso tipo="bad">{erro}</Aviso>}
            <Btn variante="primary" icone="check" bloco onClick={confirmar}>
              Confirmar pedido
            </Btn>
          </section>
        </div>
      </div>
    </div>
  )
}

// ---------- Ações do pedido ----------

function ModalRecebimento({ aberto, onFechar, pedido, tipo }) {
  const { api } = useStore()
  const toast = useToast()
  const devolucao = tipo === 'devolucao'
  const saldo = saldoPedido(pedido)
  const recebido = recebidoPedido(pedido)
  const [valor, setValor] = useState(devolucao ? recebido : saldo)
  const [data, setData] = useState(hojeISO())
  const [meio, setMeio] = useState('Pix')
  const [obs, setObs] = useState('')
  const max = devolucao ? recebido : Infinity
  const valido = Number.isFinite(valor) && valor > 0 && valor <= max + 0.001 && !!data && (!devolucao || obs.trim())
  const salvar = () => {
    if (!valido) return
    const reg = { id: novoId(), valor: round2(valor), data, meio, [devolucao ? 'motivo' : 'obs']: obs.trim() }
    const lista = devolucao ? 'devolucoes' : 'recebimentos'
    api.salvar('pedidos', {
      ...pedido,
      [lista]: [...(pedido[lista] || []), reg],
      historico: [...(pedido.historico || []), registro(devolucao ? 'devolucao' : 'recebimento', { valor: reg.valor, meio, motivo: devolucao ? obs.trim() : undefined, data })],
    })
    toast(devolucao ? 'Devolução registrada' : 'Recebimento registrado')
    onFechar()
  }
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={devolucao ? 'Registrar devolução' : 'Registrar recebimento'}
      subtitulo={
        devolucao
          ? 'Faça a devolução ao cliente fora do app e registre aqui para manter os valores corretos.'
          : 'Pode registrar um sinal agora e o restante depois. Isso organiza os pagamentos; não faz cobrança.'
      }
      rodape={
        <>
          <Btn onClick={onFechar}>Cancelar</Btn>
          <Btn variante="primary" disabled={!valido} onClick={salvar}>
            {devolucao ? 'Registrar devolução' : 'Registrar recebimento'}
          </Btn>
        </>
      }
    >
      <div className="grid-3">
        <Numero rotulo="Valor" prefixo="R$" valor={valor} onMuda={setValor} casas={2} erro={Number.isFinite(valor) && valor > max + 0.001 ? `No máximo ${fmtBRL(max)}.` : null} />
        <Field rotulo="Data" htmlFor="rec-data">
          <input id="rec-data" type="date" className="input" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>
        <Selecao rotulo="Meio" valor={meio} onMuda={setMeio} opcoes={MEIOS_PAGAMENTO.map((m) => ({ valor: m, rotulo: m }))} />
      </div>
      <Texto rotulo={devolucao ? 'Motivo da devolução' : 'Observação (opcional)'} valor={obs} onMuda={setObs} maxLength={200} placeholder={devolucao ? 'Ex.: peça com defeito' : 'Ex.: sinal de 50%'} />
      {!devolucao && (
        <p className="small muted">
          Falta receber {fmtBRL(saldo)} de {fmtBRL(n0(pedido.total))}.
        </p>
      )}
    </Modal>
  )
}

function ModalEtapa({ aberto, onFechar, pedido, modo }) {
  const { api } = useStore()
  const toast = useToast()
  const atual = indiceEtapa(pedido.etapa)
  const opcoes = modo === 'reabrir' ? ETAPAS.filter((e) => e.valor !== 'entregue') : ETAPAS.filter((_, i) => i < atual)
  const [para, setPara] = useState(opcoes[opcoes.length - 1]?.valor || 'confirmado')
  const [motivo, setMotivo] = useState('')
  const titulos = { corrigir: 'Corrigir etapa', reabrir: 'Reabrir pedido', cancelar: 'Cancelar pedido', reativar: 'Reativar pedido' }
  const salvar = () => {
    if (!motivo.trim()) return
    if (modo === 'cancelar') {
      api.salvar('pedidos', { ...pedido, cancelado: true, historico: [...(pedido.historico || []), registro('cancelado', { motivo: motivo.trim() })] })
      toast('Pedido cancelado')
    } else if (modo === 'reativar') {
      api.salvar('pedidos', { ...pedido, cancelado: false, historico: [...(pedido.historico || []), registro('reativado', { motivo: motivo.trim() })] })
      toast('Pedido reativado')
    } else {
      api.salvar('pedidos', {
        ...pedido,
        etapa: para,
        historico: [...(pedido.historico || []), registro(modo === 'reabrir' ? 'reaberto' : 'correcao', { de: pedido.etapa, para, motivo: motivo.trim() })],
      })
      toast(modo === 'reabrir' ? 'Pedido reaberto' : 'Etapa corrigida')
    }
    onFechar()
  }
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={titulos[modo]}
      subtitulo={
        modo === 'cancelar'
          ? 'Cancelar preserva itens, valores e histórico, mas não devolve dinheiro. Se houver devolução, registre-a no pedido.'
          : 'O motivo fica no histórico do pedido.'
      }
      rodape={
        <>
          <Btn onClick={onFechar}>Voltar</Btn>
          <Btn variante={modo === 'cancelar' ? 'danger-solid' : 'primary'} disabled={!motivo.trim()} onClick={salvar}>
            {titulos[modo]}
          </Btn>
        </>
      }
    >
      {(modo === 'corrigir' || modo === 'reabrir') && (
        <Selecao rotulo="Voltar para a etapa" valor={para} onMuda={setPara} opcoes={opcoes.map((e) => ({ valor: e.valor, rotulo: e.rotulo }))} />
      )}
      <Texto rotulo="Motivo" valor={motivo} onMuda={setMotivo} maxLength={200} placeholder={modo === 'cancelar' ? 'Ex.: cliente desistiu' : 'Ex.: marquei por engano'} />
    </Modal>
  )
}

const DESC_HIST = {
  criado: (h) => (h.origem === 'orcamento' ? 'Pedido criado a partir do orçamento' : 'Pedido criado'),
  etapa: (h) => `${rotuloEtapa(h.de)} → ${rotuloEtapa(h.para)}`,
  correcao: (h) => `Etapa corrigida: ${rotuloEtapa(h.de)} → ${rotuloEtapa(h.para)}`,
  reaberto: (h) => `Pedido reaberto em ${rotuloEtapa(h.para)}`,
  cancelado: () => 'Pedido cancelado',
  reativado: () => 'Pedido reativado',
  recebimento: (h) => `Recebido ${fmtBRL(n0(h.valor))} (${h.meio})`,
  devolucao: (h) => `Devolução de ${fmtBRL(n0(h.valor))} (${h.meio})`,
  prazo: (h) => `Prazo alterado: ${h.de ? fmtData(h.de) : 'sem prazo'} → ${h.para ? fmtData(h.para) : 'sem prazo'}`,
  removido: (h) => `Registro de ${fmtBRL(n0(h.valor))} removido`,
}

function DetalhePedido({ id, ir, onVoltar }) {
  const { dados, api } = useStore()
  const toast = useToast()
  const confirmar = useConfirmar()
  const [modal, setModal] = useState(null)
  const p = dados.pedidos[id]
  if (!p) return <Vazio titulo="Pedido não encontrado" texto="Ele pode ter sido excluído." />
  const cliente = p.clienteId ? dados.clientes[p.clienteId] : null
  const prox = proximaEtapa(p.etapa)
  const idx = indiceEtapa(p.etapa)
  const saldo = saldoPedido(p)
  const recebido = recebidoPedido(p)

  const avancar = () => {
    api.salvar('pedidos', { ...p, etapa: prox, historico: [...(p.historico || []), registro('etapa', { de: p.etapa, para: prox })] })
    toast(`Pedido em ${rotuloEtapa(prox)}`)
  }
  const mudarPrazo = (novo) => {
    if (novo === (p.prazo || '')) return
    api.salvar('pedidos', { ...p, prazo: novo || null, historico: [...(p.historico || []), registro('prazo', { de: p.prazo || null, para: novo || null })] })
  }
  const removerRegistro = async (lista, reg) => {
    const okk = await confirmar({ titulo: 'Remover este registro?', texto: `${fmtBRL(n0(reg.valor))} em ${fmtData(reg.data)} (${reg.meio}). Use só para corrigir um lançamento feito por engano.`, acao: 'Remover', perigo: true })
    if (!okk) return
    api.salvar('pedidos', { ...p, [lista]: (p[lista] || []).filter((r) => r.id !== reg.id), historico: [...(p.historico || []), registro('removido', { valor: reg.valor })] })
  }

  return (
    <div className="stack">
      <div className="row between top">
        <div className="stack-sm">
          {onVoltar && (
            <button type="button" className="linklike muted small" onClick={onVoltar} style={{ alignSelf: 'flex-start' }}>
              ← Voltar à lista de pedidos
            </button>
          )}
          <div className="row">
            <h2>
              Pedido #{numeroDoc(p.numero)} · {p.clienteNome}
            </h2>
            <PillEtapa p={p} />
            {atrasado(p) && <Pill tipo="bad">Atrasado</Pill>}
            {p.exemplo && <Pill>Exemplo</Pill>}
          </div>
          <span className="small muted">Criado em {fmtDataHora(p.criadoEm)}</span>
        </div>
        <Btn icone="whats" variante="primary" onClick={() => setModal('whats')}>
          Avisar cliente pelo WhatsApp
        </Btn>
      </div>

      {p.cancelado ? (
        <Aviso tipo="bad">
          <div className="stack-sm">
            <span>Pedido cancelado. Itens, valores e histórico ficam guardados.</span>
            <div className="actions">
              {recebido > 0 && (
                <Btn tamanho="sm" onClick={() => setModal('devolucao')}>
                  Registrar devolução
                </Btn>
              )}
              <Btn tamanho="sm" variante="ghost" onClick={() => setModal('reativar')}>
                Reativar pedido
              </Btn>
            </div>
          </div>
        </Aviso>
      ) : (
        <section className="card stack">
          <div className="steps">
            {ETAPAS.map((e, i) => (
              <div key={e.valor} className={'step' + (i < idx ? ' done' : i === idx ? ' current done' : '')}>
                <span className="bar" />
                <span>{e.rotulo}</span>
              </div>
            ))}
          </div>
          <div className="actions">
            {prox ? (
              <Btn variante="primary" icone="seta" onClick={avancar}>
                Avançar para {rotuloEtapa(prox)}
              </Btn>
            ) : (
              <Btn icone="reabrir" onClick={() => setModal('reabrir')}>
                Reabrir pedido
              </Btn>
            )}
            {idx > 0 && p.etapa !== 'entregue' && (
              <Btn variante="ghost" icone="voltar" onClick={() => setModal('corrigir')}>
                Corrigir etapa
              </Btn>
            )}
          </div>
          <p className="tiny muted">A etapa de produção e o pagamento são controles separados: marcar como entregue não registra recebimento.</p>
        </section>
      )}

      <div className="grid-2">
        <section className="card stack-sm">
          <h3>Valores</h3>
          <div className="kv">
            <span>Itens</span>
            <span>{fmtBRL(subtotalItens(p.itens))}</span>
          </div>
          {n0(p.valorEnvio) > 0 && (
            <div className="kv">
              <span>Envio</span>
              <span>{fmtBRL(n0(p.valorEnvio))}</span>
            </div>
          )}
          {n0(p.desconto) > 0 && (
            <div className="kv">
              <span>Desconto</span>
              <span>− {fmtBRL(n0(p.desconto))}</span>
            </div>
          )}
          <div className="kv strong">
            <span>Total do pedido</span>
            <span>{fmtBRL(n0(p.total))}</span>
          </div>
          <div className="kv">
            <span>Já recebido</span>
            <span className="ok-text">{fmtBRL(recebido)}</span>
          </div>
          <div className="kv" style={{ fontSize: '1.05rem' }}>
            <span>Falta receber</span>
            <span className={saldo > 0 ? 'bad-text' : 'ok-text'}>{fmtBRL(saldo)}</span>
          </div>
          {!p.cancelado && (
            <div className="actions">
              <Btn variante="primary" tamanho="sm" icone="dinheiro" disabled={saldo <= 0} onClick={() => setModal('recebimento')}>
                Registrar recebimento
              </Btn>
              {recebido > 0 && (
                <Btn tamanho="sm" variante="ghost" onClick={() => setModal('devolucao')}>
                  Registrar devolução
                </Btn>
              )}
            </div>
          )}
          {[...(p.recebimentos || []).map((r) => ['recebimentos', r]), ...(p.devolucoes || []).map((r) => ['devolucoes', r])].length > 0 && (
            <div className="stack-sm" style={{ marginTop: 6 }}>
              {(p.recebimentos || []).map((r) => (
                <div key={r.id} className="row between small">
                  <span>
                    {fmtData(r.data)} · {r.meio}
                    {r.obs ? ` · ${r.obs}` : ''}
                  </span>
                  <span className="row" style={{ gap: 4 }}>
                    <span className="num ok-text">+{fmtBRL(n0(r.valor))}</span>
                    <Btn tamanho="sm" variante="ghost" icone="fechar" aria-label="Remover registro" onClick={() => removerRegistro('recebimentos', r)} />
                  </span>
                </div>
              ))}
              {(p.devolucoes || []).map((r) => (
                <div key={r.id} className="row between small">
                  <span>
                    {fmtData(r.data)} · devolução · {r.motivo}
                  </span>
                  <span className="row" style={{ gap: 4 }}>
                    <span className="num bad-text">−{fmtBRL(n0(r.valor))}</span>
                    <Btn tamanho="sm" variante="ghost" icone="fechar" aria-label="Remover registro" onClick={() => removerRegistro('devolucoes', r)} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card stack-sm">
          <h3>Entrega e cliente</h3>
          <Field rotulo="Prazo" htmlFor={`prazo-${p.id}`}>
            <input id={`prazo-${p.id}`} type="date" className="input" value={p.prazo || ''} onChange={(e) => mudarPrazo(e.target.value)} disabled={p.cancelado} />
          </Field>
          {p.prazo && !p.cancelado && p.etapa !== 'entregue' && (
            <span className={'small ' + (atrasado(p) ? 'bad-text' : 'muted')}>
              {atrasado(p) ? `Atrasado há ${diffDias(hojeISO(), p.prazo)} dia(s)` : diffDias(p.prazo, hojeISO()) === 0 ? 'Vence hoje' : `Faltam ${diffDias(p.prazo, hojeISO())} dia(s)`}
            </span>
          )}
          <hr className="divider" />
          <span className="strong">{p.clienteNome}</span>
          {cliente?.whatsapp && <span className="small num">{cliente.whatsapp}</span>}
          {cliente?.observacao && <span className="small muted">{cliente.observacao}</span>}
          <div className="actions">
            {cliente && (
              <Btn tamanho="sm" onClick={() => ir('clientes', { clienteId: cliente.id })}>
                Ver histórico do cliente
              </Btn>
            )}
            {p.orcamentoId && dados.orcamentos[p.orcamentoId] && (
              <Btn tamanho="sm" variante="ghost" onClick={() => ir('orcamentos', { orcamentoId: p.orcamentoId })}>
                Orçamento {numeroDoc(dados.orcamentos[p.orcamentoId].numero)}
              </Btn>
            )}
          </div>
          {p.observacoes && <p className="small" style={{ whiteSpace: 'pre-wrap' }}>{p.observacoes}</p>}
        </section>
      </div>

      <section className="card stack-sm">
        <h3>Itens</h3>
        {p.itens.map((it, i) => (
          <div className="row" key={i} style={{ flexWrap: 'nowrap' }}>
            <Miniatura id={it.fotoId} nome={it.nome} tamanho={36} />
            <div className="grow">
              <div className="strong small">{it.nome}</div>
              <div className="tiny muted num">
                {it.quantidade} × {fmtBRL(n0(it.precoUnitario))}
              </div>
            </div>
            <span className="num">{fmtBRL(n0(it.quantidade) * n0(it.precoUnitario))}</span>
          </div>
        ))}
      </section>

      <section className="card stack-sm">
        <h3>Histórico</h3>
        <div className="timeline">
          {[...(p.historico || [])]
            .sort((a, b) => b.em - a.em)
            .map((h) => (
              <div className="tl" key={h.id}>
                <span className={'tl-dot ' + (h.tipo === 'cancelado' || h.tipo === 'devolucao' ? 'bad' : h.tipo === 'recebimento' ? 'ok' : h.tipo === 'etapa' ? 'accent' : '')} />
                <div>
                  <div className="small strong">{(DESC_HIST[h.tipo] || (() => h.tipo))(h)}</div>
                  <div className="tiny muted">
                    {fmtDataHora(h.em)}
                    {h.motivo ? ` · ${h.motivo}` : ''}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {!p.cancelado && (
        <div>
          <Btn variante="ghost" icone="cancelar" onClick={() => setModal('cancelar')}>
            Cancelar pedido
          </Btn>
        </div>
      )}

      {(modal === 'recebimento' || modal === 'devolucao') && <ModalRecebimento aberto onFechar={() => setModal(null)} pedido={p} tipo={modal} />}
      {['corrigir', 'reabrir', 'cancelar', 'reativar'].includes(modal) && <ModalEtapa aberto onFechar={() => setModal(null)} pedido={p} modo={modal} />}
      <ModalWhats
        aberto={modal === 'whats'}
        onFechar={() => setModal(null)}
        titulo={`Avisar ${p.clienteNome}`}
        numero={cliente?.whatsapp || ''}
        mensagem={mensagemPedido(p, dados.config)}
        aviso={!cliente?.whatsapp ? 'Este cliente está sem WhatsApp no cadastro. Complete o cadastro ou digite o número abaixo.' : null}
      />
    </div>
  )
}

// ---------- Página ----------

export default function Pedidos({ params, ir }) {
  const { dados } = useStore()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState(params?.filtro || 'andamento')
  const [selecionado, setSelecionado] = useState(params?.pedidoId || null)
  const [numeracao, setNumeracao] = useState(false)
  if (params?.novo) return <FormPedido params={params} ir={ir} />

  const todos = Object.values(dados.pedidos).sort((a, b) => n0(b.numero) - n0(a.numero))
  const andamento = todos.filter(emAndamento)
  const atrasados = todos.filter(atrasado)
  const aReceber = todos.reduce((s, p) => s + saldoPedido(p), 0)
  const lista = todos.filter((p) => {
    const okFiltro =
      filtro === 'todos' ||
      (filtro === 'andamento' && emAndamento(p)) ||
      (filtro === 'atrasados' && atrasado(p)) ||
      (filtro === 'receber' && saldoPedido(p) > 0) ||
      etapaVisivel(p) === filtro
    const b = busca.trim()
    const okBusca = !b || contem(p.clienteNome, b) || String(p.numero).includes(b.replace(/^#?0*/, '')) || p.itens.some((it) => contem(it.nome, b))
    return okFiltro && okBusca
  })

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Vendas</span>
          <h1>Pedidos</h1>
          <p>Do aceite à entrega: etapa, prazo e o que falta receber de cada pedido.</p>
        </div>
        <div className="actions">
          <Btn icone="planilha" onClick={() => ir('planilhas')}>
            Planilha financeira
          </Btn>
          <Btn icone="editar" onClick={() => setNumeracao(true)}>
            Numeração
          </Btn>
          <Btn variante="primary" icone="mais2" onClick={() => ir('pedidos', { novo: true })}>
            Novo pedido
          </Btn>
        </div>
      </div>

      <div className="stats">
        <button type="button" className="stat-card stat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setFiltro('andamento')}>
          <span className="label">Em andamento</span>
          <span className="v">{andamento.length}</span>
        </button>
        <button type="button" className={'stat-card stat' + (atrasados.length ? ' alert' : '')} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setFiltro('atrasados')}>
          <span className="label">Atrasados</span>
          <span className="v">{atrasados.length}</span>
        </button>
        <button type="button" className="stat-card stat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setFiltro('receber')}>
          <span className="label">A receber</span>
          <span className="v">{fmtBRL(aReceber)}</span>
        </button>
      </div>

      {!todos.length ? (
        <Vazio titulo="Nenhum pedido ainda" texto="Quando o cliente aprovar um orçamento, transforme em pedido. Ou registre uma venda direto do catálogo.">
          <Btn variante="primary" icone="mais2" onClick={() => ir('pedidos', { novo: true })}>
            Criar pedido
          </Btn>
        </Vazio>
      ) : (
        <div className={'split' + (selecionado && dados.pedidos[selecionado] ? ' tem-sel' : '')}>
          <div className="stack">
            <div className="row">
              <div className="grow">
                <Busca valor={busca} onMuda={setBusca} placeholder="Cliente, peça ou número" />
              </div>
              <select className="select" style={{ width: 'auto' }} value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar etapa">
                <option value="andamento">Em andamento</option>
                <option value="atrasados">Atrasados</option>
                <option value="receber">Com valor a receber</option>
                <option value="todos">Todas as etapas</option>
                {ETAPAS.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.rotulo}
                  </option>
                ))}
                <option value="cancelado">Cancelados</option>
              </select>
            </div>
            <div className="list">
              {lista.map((p) => (
                <button type="button" key={p.id} className={'list-item' + (selecionado === p.id ? ' selected' : '')} onClick={() => {
                    setSelecionado(p.id)
                    if (window.innerWidth <= 1100) window.scrollTo(0, 0)
                  }}>
                  <div className="grow stack-sm" style={{ gap: 3 }}>
                    <div className="row between">
                      <span className="strong">
                        #{numeroDoc(p.numero)} · {p.clienteNome}
                      </span>
                      <PillEtapa p={p} />
                    </div>
                    <span className="small muted">{resumoItens(p.itens)}</span>
                    <div className="row between small">
                      <span className={atrasado(p) ? 'bad-text strong' : 'muted'}>{p.prazo ? `${atrasado(p) ? 'Atrasado' : 'Prazo'}: ${fmtData(p.prazo)}` : 'Sem prazo'}</span>
                      <span className="num">
                        {fmtBRL(n0(p.total))}
                        {saldoPedido(p) > 0 && <span className="muted"> · falta {fmtBRL(saldoPedido(p))}</span>}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
              {!lista.length && <p className="muted small">Nenhum pedido neste filtro.</p>}
            </div>
          </div>
          <div>
            {selecionado && dados.pedidos[selecionado] ? (
              <DetalhePedido key={selecionado} id={selecionado} ir={ir} onVoltar={() => setSelecionado(null)} />
            ) : (
              <div className="empty">
                <h3>Abra um pedido</h3>
                <p>Escolha um pedido na lista para mudar a etapa, registrar recebimentos e avisar o cliente.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {numeracao && <ModalNumeracao aberto onFechar={() => setNumeracao(false)} tipo="pedido" />}
    </div>
  )
}
