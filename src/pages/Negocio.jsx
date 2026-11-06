import { useEffect, useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Check, Field, Modal, NumInput, Numero, Percentual, Secao, Seg, SeletorArquivo, Texto, Aviso, Pill, Imagem, useConfirmar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { canaisPadrao } from '../lib/defaults.js'
import { fmtBRL, fmtPct, n0, novoId } from '../lib/format.js'
import { rateioFixos, contextoDe } from '../lib/pricing.js'
import { comprimirImagem, lerArquivoComoDataURL } from '../lib/files.js'
import { prefixoSku } from '../lib/negocio.js'

function rotuloRevisao(m) {
  if (!m) return ''
  const [a, mes] = String(m).split('-')
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return mes ? `${nomes[Number(mes) - 1] || mes}/${a}` : m
}

function validarFaixas(faixas) {
  if (!faixas.length || faixas.length > 20) return 'Use de 1 a 20 faixas.'
  let anterior = -1
  for (const [i, f] of faixas.entries()) {
    const ultima = i === faixas.length - 1
    if (!(n0(f.taxaPct) >= 0 && n0(f.taxaPct) < 1)) return `Faixa ${i + 1}: confira o percentual.`
    if (ultima) {
      if (f.ate !== null) return 'Deixe só a última faixa sem limite.'
    } else {
      if (!(Number.isFinite(f.ate) && f.ate > 0)) return `Faixa ${i + 1}: informe o limite em reais.`
      const c = Math.round(f.ate * 100)
      if (c <= anterior) return 'Os limites devem estar em ordem crescente.'
      anterior = c
    }
    if (f.adicional.tipo === 'fixo' && !(n0(f.adicional.valor) >= 0)) return `Faixa ${i + 1}: confira o adicional.`
    if (f.adicional.tipo === 'percentual' && !(n0(f.adicional.pct) >= 0 && n0(f.adicional.pct) < 1)) return `Faixa ${i + 1}: confira o adicional.`
  }
  return null
}

function ModalCanal({ aberto, onFechar, inicial, onSalvar }) {
  const vazio = { id: '', nome: '', curto: '', taxaPct: 0, taxaFixa: 0, faixas: null, revisadoEm: '', ativo: true }
  const [c, setC] = useState(vazio)
  const [tentou, setTentou] = useState(false)
  useEffect(() => {
    if (aberto) {
      setC(inicial ? JSON.parse(JSON.stringify(inicial)) : vazio)
      setTentou(false)
    }
  }, [aberto, inicial]) // eslint-disable-line
  const set = (k, v) => setC((x) => ({ ...x, [k]: v }))
  const comFaixas = Array.isArray(c.faixas)
  const setFaixa = (i, patch) => set('faixas', c.faixas.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const erro = !c.nome.trim()
    ? 'Dê um nome ao canal.'
    : comFaixas
      ? validarFaixas(c.faixas)
      : !(n0(c.taxaPct) >= 0 && n0(c.taxaPct) < 1)
        ? 'Confira o percentual.'
        : !(n0(c.taxaFixa) >= 0)
          ? 'Confira a taxa fixa.'
          : null
  const salvar = () => {
    setTentou(true)
    if (erro) return
    onSalvar({ ...c, id: c.id || novoId(), nome: c.nome.trim(), curto: c.curto?.trim() || c.nome.trim() })
    onFechar()
  }
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      largo
      titulo={inicial ? `Editar ${inicial.nome}` : 'Novo canal de venda'}
      subtitulo="As taxas são referências editáveis. Confira as condições da sua conta em cada plataforma."
      rodape={
        <>
          <Btn onClick={onFechar}>Cancelar</Btn>
          <Btn variante="primary" onClick={salvar}>
            Salvar canal
          </Btn>
        </>
      }
    >
      <div className="grid-3">
        <Texto rotulo="Nome" valor={c.nome} onMuda={(v) => set('nome', v)} maxLength={60} placeholder="Ex.: TikTok Shop" />
        <Texto rotulo="Nome curto" valor={c.curto} onMuda={(v) => set('curto', v)} maxLength={20} />
        <Field rotulo="Taxas revisadas em" htmlFor="canal-rev">
          <input id="canal-rev" type="month" className="input" value={c.revisadoEm || ''} onChange={(e) => set('revisadoEm', e.target.value)} />
        </Field>
      </div>
      <Seg
        valor={comFaixas ? 'faixas' : 'simples'}
        onMuda={(v) =>
          set(
            'faixas',
            v === 'faixas'
              ? [
                  { ate: 79.99, taxaPct: n0(c.taxaPct), adicional: { tipo: 'fixo', valor: n0(c.taxaFixa) } },
                  { ate: null, taxaPct: n0(c.taxaPct), adicional: { tipo: 'fixo', valor: n0(c.taxaFixa) } },
                ]
              : null,
          )
        }
        rotulo="Tipo de taxa"
        opcoes={[
          { valor: 'simples', rotulo: 'Taxa única' },
          { valor: 'faixas', rotulo: 'Taxa por faixa de preço' },
        ]}
      />
      {!comFaixas ? (
        <div className="grid-2">
          <Percentual rotulo="Comissão" valor={c.taxaPct} onMuda={(v) => set('taxaPct', v)} />
          <Numero rotulo="Taxa fixa por unidade" prefixo="R$" valor={c.taxaFixa} onMuda={(v) => set('taxaFixa', v)} casas={2} />
        </div>
      ) : (
        <div className="stack-sm">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Preço até</th>
                  <th>Comissão</th>
                  <th>Adicional</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {c.faixas.map((f, i) => {
                  const ultima = i === c.faixas.length - 1
                  return (
                    <tr key={i}>
                      <td style={{ minWidth: 120 }}>{ultima ? <span className="muted small">sem limite</span> : <NumInput valor={f.ate} onMuda={(v) => setFaixa(i, { ate: v })} prefixo="R$" casas={2} aria-label="Limite da faixa" />}</td>
                      <td style={{ minWidth: 100 }}>
                        <NumInput valor={Math.round(n0(f.taxaPct) * 1e6) / 1e4} onMuda={(v) => setFaixa(i, { taxaPct: Number.isFinite(v) ? v / 100 : v })} unidade="%" casas={2} aria-label="Comissão" />
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <select className="select" value={f.adicional.tipo} onChange={(e) => setFaixa(i, { adicional: e.target.value === 'fixo' ? { tipo: 'fixo', valor: 0 } : { tipo: 'percentual', pct: 0 } })} aria-label="Tipo do adicional">
                          <option value="fixo">Fixo (R$)</option>
                          <option value="percentual">% do preço</option>
                        </select>
                      </td>
                      <td style={{ minWidth: 110 }}>
                        {f.adicional.tipo === 'fixo' ? (
                          <NumInput valor={f.adicional.valor} onMuda={(v) => setFaixa(i, { adicional: { tipo: 'fixo', valor: v } })} prefixo="R$" casas={2} aria-label="Adicional fixo" />
                        ) : (
                          <NumInput valor={Math.round(n0(f.adicional.pct) * 1e6) / 1e4} onMuda={(v) => setFaixa(i, { adicional: { tipo: 'percentual', pct: Number.isFinite(v) ? v / 100 : v } })} unidade="%" casas={2} aria-label="Adicional percentual" />
                        )}
                      </td>
                      <td>
                        {c.faixas.length > 1 && (
                          <Btn
                            variante="ghost"
                            icone="fechar"
                            aria-label="Remover faixa"
                            onClick={() => {
                              const nf = c.faixas.filter((_, j) => j !== i)
                              nf[nf.length - 1] = { ...nf[nf.length - 1], ate: null }
                              set('faixas', nf)
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Btn
            tamanho="sm"
            icone="mais2"
            disabled={c.faixas.length >= 20}
            onClick={() => {
              const nf = [...c.faixas]
              const ult = nf[nf.length - 1]
              const pen = nf.length > 1 ? n0(nf[nf.length - 2].ate) : 0
              nf[nf.length - 1] = { ...ult, ate: Math.round((pen + 100) * 100) / 100 - 0.01 }
              nf.push({ ...ult, ate: null })
              set('faixas', nf)
            }}
          >
            Adicionar faixa
          </Btn>
          <p className="tiny muted">Use limites em centavos, em ordem crescente. A última faixa fica sem limite. O app escolhe o menor preço que mantém o seu lucro em cada faixa.</p>
        </div>
      )}
      <Check marcado={c.ativo !== false} onMuda={(v) => set('ativo', v)}>
        Mostrar este canal nos cálculos
      </Check>
      {tentou && erro && <Aviso tipo="bad">{erro}</Aviso>}
    </Modal>
  )
}

export default function Negocio({ params }) {
  const { dados, api } = useStore()
  const toast = useToast()
  const confirmar = useConfirmar()
  const cfg = dados.config
  const [canalModal, setCanalModal] = useState(null)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const setNeg = (k, v) => api.atualizarConfig((c) => ({ ...c, negocio: { ...c.negocio, [k]: v } }))
  const setCusto = (k, v) => api.atualizarConfig((c) => ({ ...c, custos: { ...c.custos, [k]: v } }))
  const setPrec = (k, v) => api.atualizarConfig((c) => ({ ...c, precificacao: { ...c.precificacao, [k]: v } }))
  const setOrc = (k, v) => api.atualizarConfig((c) => ({ ...c, orcamento: { ...c.orcamento, [k]: v } }))
  const ctx = contextoDe(dados)
  const totalFixos = (cfg.custosFixos || []).reduce((s, f) => s + n0(f.valorMensal), 0)

  useEffect(() => {
    if (params?.secao) document.getElementById('secao-' + params.secao)?.scrollIntoView({ block: 'start' })
  }, [params])

  const enviarLogo = async (file) => {
    setEnviandoLogo(true)
    try {
      const bruto = await lerArquivoComoDataURL(file)
      const { dataUrl } = await comprimirImagem(bruto, { ladoMax: 600, limite: Math.min(api.limiteImagem(), 200000), manterTransparencia: true })
      const anterior = cfg.negocio.logoId
      const id = await api.salvarImagem(dataUrl, { origem: 'logo' })
      setNeg('logoId', id)
      if (anterior) api.apagarImagem(anterior)
      toast('Logo atualizada')
    } catch (e) {
      toast(e.message || 'Não foi possível usar esta imagem.', 'bad')
    } finally {
      setEnviandoLogo(false)
    }
  }

  const salvarCanal = (canal) => {
    api.atualizarConfig((c) => {
      const existe = c.canais.some((x) => x.id === canal.id)
      return { ...c, canais: existe ? c.canais.map((x) => (x.id === canal.id ? canal : x)) : [...c.canais, canal] }
    })
    toast('Canal salvo')
  }

  const restaurarCanais = async () => {
    const okk = await confirmar({ titulo: 'Restaurar canais padrão?', texto: 'Shopee, Mercado Livre, cartão 3x e Pix voltam às taxas de referência. Canais que você criou continuam na lista.', acao: 'Restaurar' })
    if (!okk) return
    api.atualizarConfig((c) => ({ ...c, canais: [...canaisPadrao(), ...c.canais.filter((x) => !x.padrao)] }))
    toast('Canais restaurados')
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Ajustes</span>
          <h1>Meu negócio</h1>
          <p>Dados que aparecem no orçamento e custos do negócio usados em todos os cálculos. As mudanças salvam sozinhas.</p>
        </div>
      </div>

      <Secao titulo="Seu negócio" descricao="Aparece no cabeçalho dos orçamentos em PDF.">
        <div className="grid-2">
          <Texto rotulo="Nome do negócio" valor={cfg.negocio.nome} onMuda={(v) => setNeg('nome', v)} maxLength={80} />
          <Texto rotulo="CNPJ ou CPF (opcional)" valor={cfg.negocio.documento} onMuda={(v) => setNeg('documento', v)} maxLength={30} />
        </div>
        <div className="grid-3">
          <Texto rotulo="WhatsApp" valor={cfg.negocio.whatsapp} onMuda={(v) => setNeg('whatsapp', v)} inputMode="tel" maxLength={30} />
          <Texto rotulo="E-mail" valor={cfg.negocio.email} onMuda={(v) => setNeg('email', v)} inputMode="email" maxLength={80} />
          <Texto rotulo="Instagram" valor={cfg.negocio.instagram} onMuda={(v) => setNeg('instagram', v)} maxLength={60} placeholder="@seuperfil" />
        </div>
        <div className="grid-2">
          <Texto rotulo="Cidade / UF" valor={cfg.negocio.cidade} onMuda={(v) => setNeg('cidade', v)} maxLength={60} />
          <Texto rotulo="Endereço (opcional)" valor={cfg.negocio.endereco} onMuda={(v) => setNeg('endereco', v)} maxLength={120} />
        </div>
        <div className="grid-2">
          <SeletorArquivo onArquivo={enviarLogo}>
            {cfg.negocio.logoId ? (
              <div style={{ maxWidth: 180, maxHeight: 80 }}>
                <Imagem id={cfg.negocio.logoId} alt="Sua logo" />
              </div>
            ) : (
              <Icon nome="imagem" tamanho={26} />
            )}
            <span className="strong small">{enviandoLogo ? 'Enviando…' : cfg.negocio.logoId ? 'Trocar logo' : 'Enviar logo'}</span>
            <span className="tiny muted">PNG com fundo transparente fica melhor.</span>
          </SeletorArquivo>
          <div className="stack-sm">
            <Check marcado={cfg.negocio.usarLogo !== false} onMuda={(v) => setNeg('usarLogo', v)}>
              Usar a logo nos orçamentos
            </Check>
            {cfg.negocio.logoId && (
              <Btn
                tamanho="sm"
                variante="ghost"
                icone="lixo"
                onClick={() => {
                  api.apagarImagem(cfg.negocio.logoId)
                  setNeg('logoId', null)
                }}
              >
                Remover logo
              </Btn>
            )}
          </div>
        </div>
      </Secao>

      <Secao titulo="Custos do negócio" descricao="Entram em todos os cálculos.">
        <div className="grid-3">
          <Numero rotulo="Tarifa de energia" unidade="R$/kWh" valor={cfg.custos.tarifaKwh} onMuda={(v) => setCusto('tarifaKwh', v)} casas={4} dica="Valor do kWh na conta de luz, com impostos. Não use o total da conta." />
          <Numero rotulo="Valor da sua hora" prefixo="R$" valor={cfg.custos.custoHoraTrabalho} onMuda={(v) => setCusto('custoHoraTrabalho', v)} casas={2} dica="Quanto vale uma hora do seu trabalho manual." />
          <Percentual rotulo="Imposto sobre a venda" valor={cfg.custos.impostoPct} onMuda={(v) => setCusto('impostoPct', v)} dica="Confirme com seu contador. MEI paga DAS fixo: lance em custos fixos." />
        </div>
      </Secao>

      <Secao titulo="Preço padrão" descricao="Ponto de partida dos novos cálculos. Cada produto pode ter o seu.">
        <div className="grid-2">
          <Numero rotulo="Markup de venda direta" unidade="×" valor={cfg.precificacao.markupVarejo} onMuda={(v) => setPrec('markupVarejo', v)} casas={2} dica="2× = preço é o dobro do custo." />
          <Numero rotulo="Markup de atacado" unidade="×" valor={cfg.precificacao.markupAtacado} onMuda={(v) => setPrec('markupAtacado', v)} casas={2} dica="Usado no preço de atacado e na tabela de atacado do orçamento." />
        </div>
      </Secao>

      <div id="secao-fixos">
        <Secao
          titulo="Custos fixos mensais"
          descricao="Aluguel, internet, DAS do MEI, assinaturas. O total é dividido pelas unidades que você produz no mês."
          acoes={
            <Btn
              tamanho="sm"
              icone="mais2"
              onClick={() => api.atualizarConfig((c) => ({ ...c, custosFixos: [...(c.custosFixos || []), { id: novoId(), nome: '', valorMensal: null }] }))}
            >
              Adicionar custo
            </Btn>
          }
        >
          {(cfg.custosFixos || []).length ? (
            <div className="stack-sm">
              {cfg.custosFixos.map((f) => (
                <div className="inline-grid" key={f.id} style={{ gridTemplateColumns: 'minmax(0,1fr) 150px 40px' }}>
                  <input
                    className="input"
                    value={f.nome}
                    placeholder="Ex.: Internet"
                    aria-label="Nome do custo"
                    onChange={(e) => api.atualizarConfig((c) => ({ ...c, custosFixos: c.custosFixos.map((x) => (x.id === f.id ? { ...x, nome: e.target.value } : x)) }))}
                  />
                  <NumInput
                    valor={f.valorMensal}
                    prefixo="R$"
                    casas={2}
                    aria-label="Valor por mês"
                    onMuda={(v) => api.atualizarConfig((c) => ({ ...c, custosFixos: c.custosFixos.map((x) => (x.id === f.id ? { ...x, valorMensal: v } : x)) }))}
                  />
                  <Btn variante="ghost" icone="fechar" aria-label="Remover custo" onClick={() => api.atualizarConfig((c) => ({ ...c, custosFixos: c.custosFixos.filter((x) => x.id !== f.id) }))} />
                </div>
              ))}
            </div>
          ) : (
            <p className="small muted">Nenhum custo fixo. Sem eles, o preço cobre só o custo de cada peça.</p>
          )}
          <div className="grid-2">
            <Numero
              rotulo="Produção estimada por mês"
              unidade="un."
              valor={cfg.producaoMensalUnidades}
              onMuda={(v) => api.atualizarConfig((c) => ({ ...c, producaoMensalUnidades: v }))}
              casas={0}
              dica="Quantas unidades você vende em um mês normal."
            />
            <div className="well stack-sm">
              <span className="label">Rateio por unidade</span>
              <span className="num strong" style={{ fontSize: '1.2rem' }}>
                {fmtBRL(rateioFixos(ctx))}
              </span>
              <span className="tiny muted">
                {fmtBRL(totalFixos)}/mês ÷ {n0(cfg.producaoMensalUnidades) || 0} un.
              </span>
            </div>
          </div>
        </Secao>
      </div>

      <Secao
        titulo="Canais de venda"
        descricao="O preço em cada canal cobre comissão, taxa fixa e imposto, mantendo o lucro da venda direta."
        acoes={
          <>
            <Btn tamanho="sm" variante="ghost" onClick={restaurarCanais}>
              Restaurar padrões
            </Btn>
            <Btn tamanho="sm" icone="mais2" onClick={() => setCanalModal({})}>
              Novo canal
            </Btn>
          </>
        }
      >
        <div className="list">
          {cfg.canais.map((c) => (
            <div className="list-item" key={c.id} style={{ flexWrap: 'wrap' }}>
              <div className="grow">
                <div className="row" style={{ gap: 8 }}>
                  <span className="strong">{c.nome}</span>
                  {c.ativo === false && <Pill>Oculto</Pill>}
                  {Array.isArray(c.faixas) && <Pill tipo="info">{c.faixas.length} faixas</Pill>}
                </div>
                <div className="tiny muted">
                  {Array.isArray(c.faixas)
                    ? c.faixas
                        .slice(0, 3)
                        .map((f) => `${f.ate === null ? 'acima' : `até ${fmtBRL(f.ate)}`}: ${fmtPct(f.taxaPct, 2)} + ${f.adicional.tipo === 'fixo' ? fmtBRL(n0(f.adicional.valor)) : fmtPct(n0(f.adicional.pct)) + ' do preço'}`)
                        .join(' · ') + (c.faixas.length > 3 ? ' · …' : '')
                    : `${fmtPct(n0(c.taxaPct), 2)} + ${fmtBRL(n0(c.taxaFixa))} por unidade`}
                  {c.revisadoEm ? ` · referência ${rotuloRevisao(c.revisadoEm)}` : ''}
                </div>
              </div>
              <div className="actions">
                <Btn tamanho="sm" icone="editar" onClick={() => setCanalModal({ item: c })}>
                  Editar
                </Btn>
                <Btn
                  tamanho="sm"
                  variante="ghost"
                  icone="lixo"
                  aria-label={`Excluir ${c.nome}`}
                  onClick={async () => {
                    const okk = await confirmar({ titulo: `Excluir ${c.nome}?`, texto: 'O canal some dos cálculos. Você pode restaurar os padrões depois.', acao: 'Excluir', perigo: true })
                    if (okk) api.atualizarConfig((x) => ({ ...x, canais: x.canais.filter((y) => y.id !== c.id) }))
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="tiny muted">Taxas de referência: Shopee out/2026; Mercado Livre, cartão e Pix jul/2026. Plataformas mudam regras com frequência (o Mercado Livre, por exemplo, cobra custo por peso em alguns envios): ajuste ao que aparece na sua conta.</p>
      </Secao>

      <Secao titulo="Orçamentos" descricao="Condições que já vêm preenchidas em cada novo orçamento.">
        <div className="grid-4">
          <Numero rotulo="Validade" unidade="dias" valor={cfg.orcamento.validadeDias} onMuda={(v) => setOrc('validadeDias', Number.isFinite(v) ? Math.floor(v) : v)} casas={0} />
          <Numero rotulo="Prazo de produção" unidade="dias úteis" valor={cfg.orcamento.prazoEntregaDias} onMuda={(v) => setOrc('prazoEntregaDias', Number.isFinite(v) ? Math.floor(v) : v)} casas={0} />
          <Numero rotulo="Desconto no Pix" unidade="%" valor={cfg.orcamento.descontoPixPercentual} onMuda={(v) => setOrc('descontoPixPercentual', v)} casas={2} />
          <Numero rotulo="Parcelas no cartão" unidade="×" valor={cfg.orcamento.parcelasCartao} onMuda={(v) => setOrc('parcelasCartao', Number.isFinite(v) ? Math.floor(v) : v)} casas={0} />
        </div>
        <Texto rotulo="Observação padrão" multilinha valor={cfg.orcamento.observacoes} onMuda={(v) => setOrc('observacoes', v)} maxLength={1000} />
      </Secao>

      <Secao titulo="SKU" descricao="Prefixo dos códigos gerados no catálogo.">
        <div className="grid-2">
          <Texto
            rotulo="Prefixo"
            valor={cfg.sku?.prefixo || ''}
            onMuda={(v) => api.atualizarConfig((c) => ({ ...c, sku: { ...c.sku, prefixo: v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) } }))}
            placeholder={prefixoSku({ ...cfg, sku: { prefixo: '' } })}
            dica="Vazio usa as iniciais do nome do negócio."
          />
          <div className="well">
            <span className="label">Exemplo</span>
            <p className="num strong" style={{ marginTop: 4 }}>
              {prefixoSku(cfg)}-VAS-001
            </p>
          </div>
        </div>
      </Secao>

      <ModalCanal aberto={!!canalModal} onFechar={() => setCanalModal(null)} inicial={canalModal?.item || null} onSalvar={salvarCanal} />
    </div>
  )
}
