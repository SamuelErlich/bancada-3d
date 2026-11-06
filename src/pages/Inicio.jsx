import { useMemo } from 'react'
import { useStore } from '../store.jsx'
import { Btn, Aviso, Miniatura, Pill } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { precificar } from '../lib/pricing.js'
import { diffDias, fmtBRL, fmtData, fmtPct, hojeISO, n0, numeroDoc } from '../lib/format.js'
import { atrasado, emAndamento, resumoItens, saldoPedido, statusOrcamento, totalOrcamento, etapaVisivel, rotuloEtapa } from '../lib/negocio.js'

export default function Inicio({ ir }) {
  const { dados, ctx } = useStore()
  const cfg = dados.config
  const pedidos = Object.values(dados.pedidos)
  const andamento = pedidos.filter(emAndamento)
  const atrasados = pedidos.filter(atrasado)
  const aReceber = pedidos.reduce((s, p) => s + saldoPedido(p), 0)
  const aguardando = Object.values(dados.orcamentos).filter((o) => statusOrcamento(o).valor === 'emitido')
  const catalogo = Object.values(dados.produtos).filter((p) => p.noCatalogo)
  const recentes = useMemo(
    () =>
      Object.values(dados.produtos)
        .sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
        .slice(0, 5)
        .map((p) => ({ p, res: precificar(p, ctx) })),
    [dados.produtos, ctx],
  )
  const proximas = andamento
    .filter((p) => p.prazo)
    .sort((a, b) => (a.prazo < b.prazo ? -1 : 1))
    .slice(0, 5)

  const passos = [
    { ok: n0(cfg.custos.tarifaKwh) > 0 && cfg.onboarding, rotulo: 'Tarifa de energia e valor da sua hora', acao: () => ir('negocio') },
    { ok: Object.keys(dados.impressoras).length > 0, rotulo: 'Cadastrar uma impressora', acao: () => ir('meu-qg', { aba: 'impressoras' }) },
    { ok: Object.keys(dados.filamentos).length + Object.keys(dados.resinas).length > 0, rotulo: 'Cadastrar um filamento ou resina', acao: () => ir('meu-qg', { aba: 'materiais' }) },
    { ok: Object.keys(dados.insumos).length > 0, rotulo: 'Cadastrar embalagens e insumos', acao: () => ir('meu-qg', { aba: 'insumos' }) },
    { ok: Object.keys(dados.produtos).length > 0, rotulo: 'Fazer o primeiro cálculo', acao: () => ir('calculadora') },
    { ok: !!cfg.negocio.nome && !!cfg.negocio.logoId, rotulo: 'Nome e logo para os orçamentos', acao: () => ir('negocio') },
    { ok: Object.keys(dados.orcamentos).length > 0, rotulo: 'Enviar o primeiro orçamento', acao: () => ir('orcamentos', { novo: true }) },
  ]
  const feitos = passos.filter((p) => p.ok).length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">{cfg.negocio.nome || 'Sua bancada'}</span>
          <h1>Início</h1>
          <p>Custos salvos viram preço, o preço vira orçamento e o orçamento aprovado vira pedido.</p>
        </div>
        <div className="actions">
          <Btn icone="orcamento" onClick={() => ir('orcamentos', { novo: true })}>
            Novo orçamento
          </Btn>
          <Btn variante="primary" icone="calculo" onClick={() => ir('calculadora')}>
            Novo cálculo
          </Btn>
        </div>
      </div>

      {cfg.exemplo && (
        <Aviso tipo="accent" icone="info">
          <div className="row between" style={{ gap: 8 }}>
            <span>Você está vendo dados de exemplo. Mexa à vontade; quando quiser começar de verdade, apague os exemplos.</span>
            <Btn tamanho="sm" onClick={() => ir('conta')}>
              Apagar exemplos
            </Btn>
          </div>
        </Aviso>
      )}

      <div className="stats">
        <button type="button" className="stat-card stat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => ir('pedidos', { filtro: 'andamento' })}>
          <span className="label">Pedidos em andamento</span>
          <span className="v">{andamento.length}</span>
        </button>
        <button type="button" className={'stat-card stat' + (atrasados.length ? ' alert' : '')} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => ir('pedidos', { filtro: 'atrasados' })}>
          <span className="label">Atrasados</span>
          <span className="v">{atrasados.length}</span>
        </button>
        <button type="button" className="stat-card stat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => ir('pedidos', { filtro: 'receber' })}>
          <span className="label">A receber</span>
          <span className="v">{fmtBRL(aReceber)}</span>
        </button>
        <button type="button" className="stat-card stat" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => ir('orcamentos')}>
          <span className="label">Orçamentos aguardando</span>
          <span className="v">
            {aguardando.length}
            <span className="small muted"> · {fmtBRL(aguardando.reduce((s, o) => s + totalOrcamento(o), 0))}</span>
          </span>
        </button>
      </div>

      <div className="split-wide">
        <section className="card stack-sm">
          <div className="row between">
            <h3>Próximas entregas</h3>
            <button type="button" className="linklike small" onClick={() => ir('pedidos')}>
              Ver pedidos
            </button>
          </div>
          {proximas.length ? (
            proximas.map((p) => {
              const d = diffDias(p.prazo, hojeISO())
              return (
                <button type="button" key={p.id} className="list-item" onClick={() => ir('pedidos', { pedidoId: p.id })}>
                  <div className="grow">
                    <div className="row between">
                      <span className="strong small">
                        #{numeroDoc(p.numero)} · {p.clienteNome}
                      </span>
                      <span className={'pill etapa-' + etapaVisivel(p)}>{rotuloEtapa(etapaVisivel(p))}</span>
                    </div>
                    <div className="row between tiny">
                      <span className="muted">{resumoItens(p.itens, 1)}</span>
                      <span className={d < 0 ? 'bad-text strong' : d === 0 ? 'warn-text strong' : 'muted'}>{d < 0 ? `atrasado ${-d} dia(s)` : d === 0 ? 'hoje' : fmtData(p.prazo)}</span>
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <p className="small muted">Nenhuma entrega com prazo marcado.</p>
          )}
        </section>

        <section className="card stack-sm">
          <div className="row between">
            <h3>Últimos cálculos</h3>
            <button type="button" className="linklike small" onClick={() => ir('calculos')}>
              Ver todos
            </button>
          </div>
          {recentes.length ? (
            recentes.map(({ p, res }) => (
              <button type="button" key={p.id} className="list-item" onClick={() => ir('calculadora', { produtoId: p.id })}>
                <Miniatura id={p.fotoId} nome={p.nome} tamanho={34} />
                <div className="grow">
                  <div className="strong small row" style={{ gap: 6 }}>
                    {p.nome}
                    {p.noCatalogo && <Icon nome="estrela" tamanho={13} preenchido className="star" />}
                  </div>
                  <div className="tiny muted num">
                    custo {fmtBRL(res.total)} · margem {fmtPct(res.margem)}
                  </div>
                </div>
                <span className="num strong">{fmtBRL(res.preco)}</span>
              </button>
            ))
          ) : (
            <p className="small muted">Você ainda não salvou cálculos.</p>
          )}
        </section>
      </div>

      {feitos < passos.length && (
        <section className="card stack-sm">
          <div className="row between">
            <h3>Monte seu QG</h3>
            <span className="small muted num">
              {feitos}/{passos.length}
            </span>
          </div>
          <div className="costbar" style={{ height: 8 }}>
            <span style={{ width: `${(feitos / passos.length) * 100}%`, background: 'var(--accent)' }} />
          </div>
          <div className="grid-2">
            {passos.map((p) => (
              <button key={p.rotulo} type="button" className="list-item" onClick={p.acao} style={{ opacity: p.ok ? 0.65 : 1 }}>
                <Icon nome={p.ok ? 'check' : 'seta'} cor={p.ok ? 'var(--ok)' : 'var(--accent)'} />
                <span className={'grow small' + (p.ok ? ' muted' : ' strong')} style={p.ok ? { textDecoration: 'line-through' } : undefined}>
                  {p.rotulo}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="row">
        <Pill>
          <Icon nome="estrela" tamanho={12} /> {catalogo.length} no catálogo
        </Pill>
        <Pill>{Object.keys(dados.clientes).length} clientes</Pill>
        <Pill>{Object.keys(dados.impressoras).length} impressoras</Pill>
      </div>
    </div>
  )
}
