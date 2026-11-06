import { useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Busca, Vazio, Check, Pill } from '../components/ui.jsx'
import { ModalCliente } from '../components/Cliente.jsx'
import ModalWhats from '../components/Whats.jsx'
import { contem, fmtBRL, fmtData, n0, numeroDoc } from '../lib/format.js'
import { etapaVisivel, rotuloEtapa, saldoPedido, statusOrcamento, totalOrcamento } from '../lib/negocio.js'

function resumoCliente(dados, c) {
  const pedidos = Object.values(dados.pedidos).filter((p) => p.clienteId === c.id)
  const orcamentos = Object.values(dados.orcamentos).filter((o) => o.clienteId === c.id)
  const validos = pedidos.filter((p) => !p.cancelado)
  return {
    pedidos: pedidos.sort((a, b) => n0(b.numero) - n0(a.numero)),
    orcamentos: orcamentos.sort((a, b) => n0(b.numero) - n0(a.numero)),
    total: validos.reduce((s, p) => s + n0(p.total), 0),
    aReceber: validos.reduce((s, p) => s + saldoPedido(p), 0),
    ultimo: validos.reduce((m, p) => Math.max(m, p.criadoEm || 0), 0),
  }
}

function DetalheCliente({ id, ir, onVoltar }) {
  const { dados, api } = useStore()
  const toast = useToast()
  const [editar, setEditar] = useState(false)
  const [whats, setWhats] = useState(false)
  const c = dados.clientes[id]
  if (!c) return <Vazio titulo="Cliente não encontrado" />
  const r = resumoCliente(dados, c)
  const arquivar = () => {
    api.salvar('clientes', { ...c, arquivado: !c.arquivado })
    toast(c.arquivado ? 'Cliente reativado' : 'Cliente arquivado')
  }
  return (
    <div className="stack">
      <div className="row between top">
        <div className="stack-sm">
          <button type="button" className="linklike muted small" onClick={onVoltar} style={{ alignSelf: 'flex-start' }}>
            ← Voltar à lista de clientes
          </button>
          <div className="row">
            <h2>{c.nome}</h2>
            {c.arquivado && <Pill>Arquivado</Pill>}
            {c.exemplo && <Pill>Exemplo</Pill>}
          </div>
          <span className="small muted">
            {[c.whatsapp, c.email].filter(Boolean).join(' · ') || 'Sem contato cadastrado'}
          </span>
        </div>
        <div className="actions">
          <Btn icone="whats" onClick={() => setWhats(true)}>
            WhatsApp
          </Btn>
          <Btn icone="editar" onClick={() => setEditar(true)}>
            Editar
          </Btn>
        </div>
      </div>
      {c.observacao && (
        <div className="well small">
          <span className="label">Observação interna</span>
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{c.observacao}</p>
        </div>
      )}
      <div className="stats">
        <div className="stat-card stat">
          <span className="label">Total comprado</span>
          <span className="v">{fmtBRL(r.total)}</span>
        </div>
        <div className="stat-card stat">
          <span className="label">Pedidos</span>
          <span className="v">{r.pedidos.length}</span>
        </div>
        <div className={'stat-card stat' + (r.aReceber > 0 ? ' alert' : '')}>
          <span className="label">A receber</span>
          <span className="v">{fmtBRL(r.aReceber)}</span>
        </div>
      </div>
      <div className="actions">
        <Btn variante="primary" icone="orcamento" disabled={c.arquivado} onClick={() => ir('orcamentos', { novo: true, clienteId: c.id })}>
          Novo orçamento
        </Btn>
        <Btn icone="pedido" disabled={c.arquivado} onClick={() => ir('pedidos', { novo: true, clienteId: c.id, origem: 'catalogo' })}>
          Novo pedido
        </Btn>
      </div>
      <section className="card stack-sm">
        <h3>Pedidos</h3>
        {r.pedidos.length ? (
          r.pedidos.map((p) => (
            <button type="button" key={p.id} className="list-item" onClick={() => ir('pedidos', { pedidoId: p.id, filtro: 'todos' })}>
              <div className="grow">
                <div className="strong small">Pedido #{numeroDoc(p.numero)}</div>
                <div className="tiny muted">
                  {rotuloEtapa(etapaVisivel(p))} · {p.prazo ? fmtData(p.prazo) : 'sem prazo'}
                </div>
              </div>
              <span className="num">{fmtBRL(n0(p.total))}</span>
            </button>
          ))
        ) : (
          <p className="small muted">Nenhum pedido.</p>
        )}
      </section>
      <section className="card stack-sm">
        <h3>Orçamentos</h3>
        {r.orcamentos.length ? (
          r.orcamentos.map((o) => (
            <button type="button" key={o.id} className="list-item" onClick={() => ir('orcamentos', { orcamentoId: o.id })}>
              <div className="grow">
                <div className="strong small">Orçamento {numeroDoc(o.numero)}</div>
                <div className="tiny muted">
                  {statusOrcamento(o).rotulo} · {fmtData(o.emitidoEm)}
                </div>
              </div>
              <span className="num">{fmtBRL(totalOrcamento(o))}</span>
            </button>
          ))
        ) : (
          <p className="small muted">Nenhum orçamento.</p>
        )}
      </section>
      <div>
        <Btn variante="ghost" icone="arquivo" onClick={arquivar}>
          {c.arquivado ? 'Reativar cliente' : 'Arquivar cliente'}
        </Btn>
        <p className="tiny muted" style={{ marginTop: 6 }}>
          Arquivar tira o cliente da seleção de novos pedidos, mas preserva o histórico.
        </p>
      </div>
      <ModalCliente aberto={editar} onFechar={() => setEditar(false)} inicial={c} />
      <ModalWhats aberto={whats} onFechar={() => setWhats(false)} titulo={`Conversar com ${c.nome}`} numero={c.whatsapp} mensagem={`Olá, ${c.nome.split(' ')[0]}! `} />
    </div>
  )
}

export default function Clientes({ params, ir }) {
  const { dados } = useStore()
  const [busca, setBusca] = useState('')
  const [arquivados, setArquivados] = useState(false)
  const [novo, setNovo] = useState(false)
  const [sel, setSel] = useState(params?.clienteId || null)

  const todos = Object.values(dados.clientes).sort((a, b) => a.nome.localeCompare(b.nome))
  const lista = todos.filter((c) => (arquivados || !c.arquivado) && (contem(c.nome, busca) || contem(c.whatsapp, busca) || contem(c.email, busca)))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Vendas</span>
          <h1>Clientes</h1>
          <p>Contato, observações e o histórico de pedidos e orçamentos de cada cliente.</p>
        </div>
        <Btn variante="primary" icone="mais2" onClick={() => setNovo(true)}>
          Novo cliente
        </Btn>
      </div>
      {!todos.length ? (
        <Vazio titulo="Nenhum cliente cadastrado" texto="Só o nome é obrigatório. Com o WhatsApp você manda o aviso de cada etapa do pedido em um toque.">
          <Btn variante="primary" icone="mais2" onClick={() => setNovo(true)}>
            Cadastrar cliente
          </Btn>
        </Vazio>
      ) : (
        <div className={'split' + (sel && dados.clientes[sel] ? ' tem-sel' : '')}>
          <div className="stack">
            <div className="row">
              <div className="grow">
                <Busca valor={busca} onMuda={setBusca} placeholder="Nome, WhatsApp ou e-mail" />
              </div>
              <Check marcado={arquivados} onMuda={setArquivados}>
                Mostrar arquivados
              </Check>
            </div>
            <div className="list">
              {lista.map((c) => {
                const r = resumoCliente(dados, c)
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={'list-item' + (sel === c.id ? ' selected' : '')}
                    onClick={() => {
                      setSel(c.id)
                      if (window.innerWidth <= 1100) window.scrollTo(0, 0)
                    }}
                  >
                    <div className="thumb layers-bg" style={{ width: 38, height: 38 }}>
                      <span className="strong">{c.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="grow">
                      <div className="strong">
                        {c.nome} {c.arquivado && <Pill>Arquivado</Pill>}
                      </div>
                      <div className="tiny muted">
                        {r.pedidos.length} pedido(s) · {c.whatsapp || 'sem WhatsApp'}
                      </div>
                    </div>
                    <span className="num small">{fmtBRL(r.total)}</span>
                  </button>
                )
              })}
              {!lista.length && <p className="small muted">Nenhum cliente encontrado.</p>}
            </div>
          </div>
          <div>
            {sel && dados.clientes[sel] ? (
              <DetalheCliente key={sel} id={sel} ir={ir} onVoltar={() => setSel(null)} />
            ) : (
              <div className="empty">
                <h3>Abra um cliente</h3>
                <p>Veja o que ele já comprou, o que está em aberto e os orçamentos enviados.</p>
              </div>
            )}
          </div>
        </div>
      )}
      <ModalCliente aberto={novo} onFechar={() => setNovo(false)} onSalvo={(c) => setSel(c.id)} />
    </div>
  )
}
