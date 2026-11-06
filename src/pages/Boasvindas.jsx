import { useMemo, useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Field, Numero, Percentual, Selecao, Seg, Texto, Aviso } from '../components/ui.jsx'
import Icon, { Logo } from '../components/Icon.jsx'
import { MODELOS_IMPRESSORA, TIPOS_FILAMENTO, NOME_APP, canaisPadrao } from '../lib/defaults.js'
import { NIVEIS_USO, precificar, pctManutencao } from '../lib/pricing.js'
import { fmtBRL, fmtPct, n0, novoId } from '../lib/format.js'

function exemploAoVivo() {
  const ctx = {
    impressoras: { p: { processo: 'fdm', valor: 5500, potenciaW: 120, amortizacao: { modo: 'prazo', meses: 12 }, horasPorDia: 8, diasPorMes: 22, nivelUso: 'medio', falhasPct: 0.05 } },
    filamentos: { f: { custoCarretel: 150, pesoCarretelG: 1000 } },
    resinas: {},
    washcures: {},
    insumos: {},
    tarifaKwh: 0.95,
    custoHoraTrabalho: 25,
    impostoPct: 0,
    custosFixosMensais: 0,
    producaoMensalUnidades: 0,
    markupAtacado: 1.5,
    canais: canaisPadrao(),
  }
  const produto = {
    pecas: [{ processo: 'fdm', impressoraId: 'p', unidadesPorMesa: 1, tempoImpressaoHoras: 2 + 40 / 60, consumos: [{ filamentoId: 'f', gramasMesa: 100 }], purgaGramas: 0, acabamentoPct: 0, reservaFalhasPct: null }],
    insumos: [],
    minutosTrabalho: 15,
    markupVarejo: 2,
    precoFinalVarejo: null,
  }
  return precificar(produto, ctx)
}

function Assistente({ onSair }) {
  const { dados, api } = useStore()
  const toast = useToast()
  const [passo, setPasso] = useState(0)
  const [custos, setCustos] = useState({ ...dados.config.custos })
  const [imp, setImp] = useState({
    modelo: 'bambu-a1',
    nome: 'Bambu Lab A1',
    processo: 'fdm',
    valor: 3500,
    potenciaW: 95,
    amortizacao: { modo: 'prazo', meses: 12, horas: 3000 },
    horasPorDia: 8,
    diasPorMes: 22,
    nivelUso: 'medio',
    falhasPct: 0.05,
  })
  const [fil, setFil] = useState({ tipo: 'PLA', nome: 'PLA Preto', cor: '#1f1f1f', custoCarretel: 110, pesoCarretelG: 1000 })
  const [res, setRes] = useState({ nome: 'Resina Standard', tipo: 'Standard', custoFrasco: 180, volumeFrascoMl: 1000 })

  const erroPasso = [
    () => (!(n0(custos.tarifaKwh) > 0) ? 'Informe a tarifa de energia.' : !(n0(custos.custoHoraTrabalho) >= 0) ? 'Revise o valor da sua hora.' : !(n0(custos.impostoPct) >= 0 && n0(custos.impostoPct) < 1) ? 'Revise o imposto.' : null),
    () =>
      !imp.nome.trim()
        ? 'Dê um nome à impressora.'
        : !(n0(imp.valor) > 0)
          ? 'Informe o valor pago.'
          : !(n0(imp.potenciaW) > 0)
            ? 'Informe o consumo médio.'
            : !(n0(imp.amortizacao.meses) >= 1)
              ? 'Informe em quantos meses ela deve se pagar.'
              : !(n0(imp.horasPorDia) > 0 && n0(imp.horasPorDia) <= 24)
                ? 'Uso por dia entre 0,01 e 24 h.'
                : !(n0(imp.diasPorMes) >= 1 && n0(imp.diasPorMes) <= 31)
                  ? 'Dias por mês entre 1 e 31.'
                  : null,
    () =>
      imp.processo === 'resina'
        ? !res.nome.trim() || !(n0(res.custoFrasco) > 0) || !(n0(res.volumeFrascoMl) > 0)
          ? 'Preencha nome, preço e volume da resina.'
          : null
        : !fil.nome.trim() || !(n0(fil.custoCarretel) > 0) || !(n0(fil.pesoCarretelG) > 0)
          ? 'Preencha nome, preço e peso do carretel.'
          : null,
  ]
  const erro = erroPasso[passo]()

  const concluir = () => {
    if (erro) return
    api.salvar('impressoras', { ...imp, id: novoId(), nome: imp.nome.trim() })
    if (imp.processo === 'resina') api.salvar('resinas', { ...res, id: novoId(), nome: res.nome.trim(), marca: '', cor: '#9aa0a4', fornecedor: '' })
    else api.salvar('filamentos', { ...fil, id: novoId(), nome: fil.nome.trim(), marca: '', fornecedor: '' })
    api.atualizarConfig((c) => ({ ...c, custos: { ...c.custos, ...custos }, onboarding: true }))
    toast('Pronto! Agora é só calcular a primeira peça.')
    onSair('calculadora')
  }

  const titulos = ['Energia e o seu tempo', 'Sua impressora', imp.processo === 'resina' ? 'Sua resina' : 'Seu filamento']

  return (
    <div className="welcome">
      <div className="card pad-lg" style={{ width: 'min(760px, 100%)' }}>
        <div className="stack">
          <div className="row between">
            <div className="row">
              <Logo tamanho={30} />
              <span className="label">
                Configuração inicial · passo {passo + 1} de 3
              </span>
            </div>
            <button type="button" className="linklike muted small" onClick={() => onSair('inicio', true)}>
              Pular por enquanto
            </button>
          </div>
          <div className="steps" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
            {titulos.map((t, i) => (
              <div key={t} className={'step' + (i < passo ? ' done' : i === passo ? ' current done' : '')}>
                <span className="bar" />
                <span>{t}</span>
              </div>
            ))}
          </div>
          <h2>{titulos[passo]}</h2>

          {passo === 0 && (
            <>
              <div className="grid-3">
                <Numero rotulo="Tarifa de energia" unidade="R$/kWh" valor={custos.tarifaKwh} onMuda={(v) => setCustos((c) => ({ ...c, tarifaKwh: v }))} casas={4} dica="Valor do kWh na conta de luz, não o total da conta." />
                <Numero rotulo="Valor da sua hora" prefixo="R$" valor={custos.custoHoraTrabalho} onMuda={(v) => setCustos((c) => ({ ...c, custoHoraTrabalho: v }))} casas={2} dica="Para acabamento, montagem e embalagem." />
                <Percentual rotulo="Imposto sobre a venda" valor={custos.impostoPct} onMuda={(v) => setCustos((c) => ({ ...c, impostoPct: v }))} dica="MEI: 0% (o DAS entra nos custos fixos)." />
              </div>
              <p className="small muted">Você muda tudo isso depois em Meu negócio.</p>
            </>
          )}

          {passo === 1 && (
            <>
              <div className="grid-2">
                <Selecao
                  rotulo="Modelo"
                  valor={imp.modelo}
                  onMuda={(id) => {
                    const m = MODELOS_IMPRESSORA.find((x) => x.id === id)
                    if (!m) return setImp((x) => ({ ...x, modelo: id }))
                    setImp((x) => ({ ...x, modelo: id, nome: m.nome, processo: m.processo, valor: m.valor, potenciaW: m.potenciaW, falhasPct: m.processo === 'resina' ? 0.08 : 0.05 }))
                  }}
                  opcoes={[
                    { grupo: 'FDM (filamento)', opcoes: MODELOS_IMPRESSORA.filter((m) => m.processo === 'fdm').map((m) => ({ valor: m.id, rotulo: m.nome })) },
                    { grupo: 'Resina', opcoes: MODELOS_IMPRESSORA.filter((m) => m.processo === 'resina').map((m) => ({ valor: m.id, rotulo: m.nome })) },
                    { grupo: 'Outra', opcoes: [{ valor: 'outra', rotulo: 'Outra impressora (digitar)' }] },
                  ]}
                />
                <Texto rotulo="Nome" valor={imp.nome} onMuda={(v) => setImp((x) => ({ ...x, nome: v }))} maxLength={80} />
              </div>
              <Field rotulo="Processo">
                <Seg valor={imp.processo} onMuda={(v) => setImp((x) => ({ ...x, processo: v }))} rotulo="Processo" opcoes={[{ valor: 'fdm', rotulo: 'FDM (filamento)' }, { valor: 'resina', rotulo: 'Resina' }]} />
              </Field>
              <div className="grid-3">
                <Numero rotulo="Valor pago" prefixo="R$" valor={imp.valor} onMuda={(v) => setImp((x) => ({ ...x, valor: v }))} casas={2} />
                <Numero rotulo="Consumo médio" unidade="W" valor={imp.potenciaW} onMuda={(v) => setImp((x) => ({ ...x, potenciaW: v }))} casas={1} dica="Durante a impressão." />
                <Numero rotulo="Prazo para se pagar" unidade="meses" valor={imp.amortizacao.meses} onMuda={(v) => setImp((x) => ({ ...x, amortizacao: { ...x.amortizacao, meses: v } }))} casas={0} />
              </div>
              <div className="grid-3">
                <Numero rotulo="Uso por dia" unidade="h" valor={imp.horasPorDia} onMuda={(v) => setImp((x) => ({ ...x, horasPorDia: v }))} casas={2} />
                <Numero rotulo="Dias por mês" unidade="dias" valor={imp.diasPorMes} onMuda={(v) => setImp((x) => ({ ...x, diasPorMes: v }))} casas={0} />
                <Percentual rotulo="Reserva para falhas" valor={imp.falhasPct} onMuda={(v) => setImp((x) => ({ ...x, falhasPct: v }))} />
              </div>
              <Selecao
                rotulo="Nível de uso"
                valor={imp.nivelUso}
                onMuda={(v) => setImp((x) => ({ ...x, nivelUso: v }))}
                opcoes={NIVEIS_USO.map((n) => ({ valor: n.valor, rotulo: `${n.rotulo}: ${n.desc}` }))}
                dica={`Reserva ${fmtPct(pctManutencao(imp))} do valor por ano para manutenção.`}
              />
            </>
          )}

          {passo === 2 &&
            (imp.processo === 'resina' ? (
              <div className="grid-3">
                <Texto rotulo="Nome" valor={res.nome} onMuda={(v) => setRes((x) => ({ ...x, nome: v }))} maxLength={80} />
                <Numero rotulo="Preço do frasco" prefixo="R$" valor={res.custoFrasco} onMuda={(v) => setRes((x) => ({ ...x, custoFrasco: v }))} casas={2} />
                <Numero rotulo="Volume" unidade="ml" valor={res.volumeFrascoMl} onMuda={(v) => setRes((x) => ({ ...x, volumeFrascoMl: v }))} casas={0} />
              </div>
            ) : (
              <>
                <div className="grid-2">
                  <Selecao
                    rotulo="Tipo"
                    valor={fil.tipo}
                    onMuda={(v) => {
                      const t = TIPOS_FILAMENTO.find((x) => x.tipo === v)
                      setFil((x) => ({ ...x, tipo: v, custoCarretel: t?.preco || x.custoCarretel, nome: x.nome.replace(/^\S+/, v) }))
                    }}
                    opcoes={TIPOS_FILAMENTO.map((t) => ({ valor: t.tipo, rotulo: t.tipo }))}
                  />
                  <Texto rotulo="Nome" valor={fil.nome} onMuda={(v) => setFil((x) => ({ ...x, nome: v }))} maxLength={80} />
                </div>
                <div className="grid-2">
                  <Numero rotulo="Preço do carretel" prefixo="R$" valor={fil.custoCarretel} onMuda={(v) => setFil((x) => ({ ...x, custoCarretel: v }))} casas={2} dica="Com frete, se você pagou." />
                  <Numero rotulo="Peso do carretel" unidade="g" valor={fil.pesoCarretelG} onMuda={(v) => setFil((x) => ({ ...x, pesoCarretelG: v }))} casas={0} />
                </div>
                <p className="small muted">Depois você cadastra as outras cores e materiais em Meu QG.</p>
              </>
            ))}

          {erro && <Aviso tipo="warn">{erro}</Aviso>}
          <div className="row between">
            <Btn variante="ghost" onClick={() => (passo ? setPasso(passo - 1) : onSair('voltar'))}>
              Voltar
            </Btn>
            {passo < 2 ? (
              <Btn variante="primary" disabled={!!erro} onClick={() => setPasso(passo + 1)}>
                Continuar
              </Btn>
            ) : (
              <Btn variante="primary" icone="check" disabled={!!erro} onClick={concluir}>
                Concluir e calcular
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Boasvindas({ onEntrar }) {
  const { api, estado } = useStore()
  const [modo, setModo] = useState('inicio')
  const [carregando, setCarregando] = useState(false)
  const ex = useMemo(exemploAoVivo, [])
  const shopee = ex.canais.find((c) => c.canal.id === 'shopee')

  if (modo === 'assistente') {
    return (
      <Assistente
        onSair={(destino, pular) => {
          if (destino === 'voltar') return setModo('inicio')
          if (pular) api.atualizarConfig((c) => ({ ...c, onboarding: true }))
          onEntrar(destino)
        }}
      />
    )
  }

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-left">
          <div className="row">
            <Logo tamanho={40} />
            <div>
              <div className="brand-name">{NOME_APP}</div>
              <div className="brand-sub">precificação, catálogo, orçamentos e pedidos</div>
            </div>
          </div>
          <h1>O preço certo da sua peça, do fatiador ao pedido entregue.</h1>
          <p className="muted">
            Cadastre impressora, material e custos uma vez. Cada cálculo vira produto no catálogo, orçamento em PDF com a sua marca e pedido acompanhado até a entrega, com aviso pelo WhatsApp.
          </p>
          <div className="actions">
            <Btn variante="primary" icone="seta" onClick={() => setModo('assistente')}>
              Configurar meu QG
            </Btn>
            <Btn
              icone="caixa"
              disabled={carregando}
              onClick={async () => {
                setCarregando(true)
                await api.carregarExemplo()
                onEntrar('inicio')
              }}
            >
              {carregando ? 'Carregando…' : 'Explorar com dados de exemplo'}
            </Btn>
          </div>
          <p className="tiny muted">
            <Icon nome="info" tamanho={13} /> {estado.descricao}. Os exemplos podem ser apagados de uma vez depois.
          </p>
        </div>
        <div className="welcome-right">
          <span className="label" style={{ color: 'color-mix(in srgb, var(--bg) 65%, transparent)' }}>
            Exemplo · 100 g de PLA, 2 h 40 min
          </span>
          <div className="stack-sm">
            {ex.composicao
              .filter((c) => c.valor > 0)
              .map((c) => (
                <div key={c.chave} className="row between small">
                  <span style={{ opacity: 0.8 }}>{c.rotulo}</span>
                  <span className="num">{fmtBRL(c.valor)}</span>
                </div>
              ))}
            <div className="row between" style={{ borderTop: '1px solid color-mix(in srgb, var(--bg) 25%, transparent)', paddingTop: 8 }}>
              <span className="strong">Custo por peça</span>
              <span className="num strong">{fmtBRL(ex.total)}</span>
            </div>
          </div>
          <div className="flow">
            <div className="flow-step">
              <span className="n">2×</span>
              <div>
                <strong>Venda direta: {fmtBRL(ex.preco)}</strong>
                <p>Lucro de {fmtBRL(ex.lucro)} por peça, margem de {fmtPct(ex.margem)}.</p>
              </div>
            </div>
            {shopee && (
              <div className="flow-step">
                <span className="n">%</span>
                <div>
                  <strong>Na Shopee: {fmtBRL(shopee.preco)}</strong>
                  <p>O mesmo lucro, já com comissão e taxa por faixa de preço.</p>
                </div>
              </div>
            )}
            <div className="flow-step">
              <span className="n">PDF</span>
              <div>
                <strong>Orçamento com a sua marca</strong>
                <p>Do catálogo para o cliente, e depois pedido com etapa, prazo e saldo.</p>
              </div>
            </div>
          </div>
          <p className="tiny" style={{ opacity: 0.7 }}>
            Além do filamento, essa peça tem {fmtBRL(ex.total - (ex.composicao.find((c) => c.chave === 'material')?.valor || 0))} em custos que quase ninguém coloca no preço.
          </p>
        </div>
      </div>
    </div>
  )
}
