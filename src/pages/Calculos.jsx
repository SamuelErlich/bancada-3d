import { useMemo, useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Busca, Vazio, useConfirmar, Miniatura, Pill } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import ModalExportar from '../components/Exportar.jsx'
import { precificar } from '../lib/pricing.js'
import { contem, fmtBRL, fmtDataHora, fmtPct } from '../lib/format.js'

export default function Calculos({ ir }) {
  const { dados, ctx, api } = useStore()
  const toast = useToast()
  const confirmar = useConfirmar()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [selecionando, setSelecionando] = useState(false)
  const [sel, setSel] = useState(() => new Set())
  const [exportar, setExportar] = useState(false)

  const todos = useMemo(
    () =>
      Object.values(dados.produtos)
        .sort((a, b) => (b.atualizadoEm || 0) - (a.atualizadoEm || 0))
        .map((p) => ({ p, res: precificar(p, ctx) })),
    [dados.produtos, ctx],
  )
  const lista = todos.filter(
    ({ p }) => (filtro === 'todos' || (filtro === 'catalogo' ? p.noCatalogo : !p.noCatalogo)) && (contem(p.nome, busca) || contem(p.sku, busca)),
  )

  const alternar = (id) =>
    setSel((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const excluir = async (p) => {
    const okk = await confirmar({
      titulo: `Excluir “${p.nome}”?`,
      texto: 'O cálculo sai da lista e do catálogo. Orçamentos e pedidos já registrados continuam com os valores combinados.',
      acao: 'Excluir',
      perigo: true,
    })
    if (!okk) return
    if (p.fotoId && dados.midias[p.fotoId]?.origem === 'foto') api.apagarImagem(p.fotoId)
    api.apagar('produtos', p.id)
    toast('Cálculo excluído')
  }

  const promover = (p) => {
    api.salvar('produtos', { ...p, noCatalogo: !p.noCatalogo })
    toast(p.noCatalogo ? 'Retirado do catálogo' : 'Promovido ao catálogo')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Precificação</span>
          <h1>Cálculos</h1>
          <p>Tudo o que você já precificou. Promova ao catálogo os produtos que vende com frequência.</p>
        </div>
        <div className="actions">
          {todos.length > 0 && (
            <Btn
              icone={selecionando ? 'fechar' : 'check'}
              onClick={() => {
                setSelecionando(!selecionando)
                setSel(new Set())
              }}
            >
              {selecionando ? 'Cancelar seleção' : 'Selecionar'}
            </Btn>
          )}
          <Btn variante="primary" icone="mais2" onClick={() => ir('calculadora')}>
            Novo cálculo
          </Btn>
        </div>
      </div>

      {todos.length === 0 ? (
        <Vazio titulo="Nenhum cálculo ainda" texto="Copie o peso e o tempo do fatiador, escolha impressora e material, e veja custo, preço e margem na hora.">
          <Btn variante="primary" icone="mais2" onClick={() => ir('calculadora')}>
            Fazer o primeiro cálculo
          </Btn>
        </Vazio>
      ) : (
        <>
          <div className="row">
            <div className="grow" style={{ maxWidth: 420 }}>
              <Busca valor={busca} onMuda={setBusca} placeholder="Buscar por nome ou SKU" />
            </div>
            <div className="chip-row">
              {[
                ['todos', `Todos (${todos.length})`],
                ['catalogo', `No catálogo (${todos.filter((x) => x.p.noCatalogo).length})`],
                ['simulacoes', `Só cálculos (${todos.filter((x) => !x.p.noCatalogo).length})`],
              ].map(([v, r]) => (
                <button key={v} type="button" className="chip" aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {selecionando && (
            <div className="row between card" style={{ padding: '10px 14px' }}>
              <span className="small">
                <strong>{sel.size}</strong> selecionado(s)
              </span>
              <div className="actions">
                <Btn tamanho="sm" onClick={() => setSel(new Set(todos.map((x) => x.p.id)))}>
                  Selecionar todos ({todos.length})
                </Btn>
                <Btn tamanho="sm" variante="primary" icone="baixar" disabled={!sel.size} onClick={() => setExportar(true)}>
                  Exportar
                </Btn>
              </div>
            </div>
          )}

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {selecionando && <th style={{ width: 36 }} />}
                  <th>Produto</th>
                  <th className="num">Custo/un.</th>
                  <th className="num">Preço</th>
                  <th className="num">Lucro</th>
                  <th className="num">Margem</th>
                  <th>Atualizado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map(({ p, res }) => (
                  <tr key={p.id} className="clickable" onClick={() => (selecionando ? alternar(p.id) : ir('calculadora', { produtoId: p.id }))}>
                    {selecionando && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={sel.has(p.id)} onChange={() => alternar(p.id)} aria-label={`Selecionar ${p.nome}`} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
                      </td>
                    )}
                    <td>
                      <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                        <Miniatura id={p.fotoId} nome={p.nome} tamanho={38} />
                        <div style={{ minWidth: 0 }}>
                          <div className="strong row" style={{ gap: 6 }}>
                            {p.nome}
                            {p.noCatalogo && <Icon nome="estrela" tamanho={14} preenchido className="star" titulo="No catálogo" />}
                          </div>
                          <div className="tiny muted">
                            {p.sku ? `${p.sku} · ` : ''}
                            {p.pecas?.length || 0} peça(s){res.precoManual ? ' · preço manual' : ''}
                            {res.avisos.length > 0 && <span className="warn-text"> · revisar cadastro</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{fmtBRL(res.total)}</td>
                    <td className="num strong">{fmtBRL(res.preco)}</td>
                    <td className={'num' + (res.lucro < 0 ? ' bad-text' : '')}>{fmtBRL(res.lucro)}</td>
                    <td className="num">{fmtPct(res.margem)}</td>
                    <td className="small muted nowrap">{fmtDataHora(p.atualizadoEm)}</td>
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <div className="actions" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <Btn tamanho="sm" variante="ghost" icone="estrela" aria-label={p.noCatalogo ? 'Retirar do catálogo' : 'Promover ao catálogo'} title={p.noCatalogo ? 'Retirar do catálogo' : 'Promover ao catálogo'} onClick={() => promover(p)} />
                        <Btn tamanho="sm" variante="ghost" icone="copiar" aria-label="Duplicar" title="Duplicar" onClick={() => ir('calculadora', { copiarDe: p.id })} />
                        <Btn tamanho="sm" variante="ghost" icone="lixo" aria-label="Excluir" title="Excluir" onClick={() => excluir(p)} />
                      </div>
                    </td>
                  </tr>
                ))}
                {!lista.length && (
                  <tr>
                    <td colSpan={selecionando ? 8 : 7} className="muted">
                      Nada encontrado com esse filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {todos.some((x) => x.p.exemplo) && (
            <p className="tiny muted">
              <Pill>Exemplo</Pill> Há cálculos de exemplo na lista. Apague todos de uma vez em Minha conta.
            </p>
          )}
        </>
      )}
      <ModalExportar aberto={exportar} onFechar={() => setExportar(false)} ids={[...sel]} />
    </div>
  )
}
