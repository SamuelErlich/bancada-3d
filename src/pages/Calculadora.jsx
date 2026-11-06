import { useMemo, useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Check, Field, NumInput, Numero, Percentual, Selecao, Texto, Aviso, Pill } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import PainelPreco from '../components/PainelPreco.jsx'
import { ModalImpressora, ModalFilamento, ModalResina, ModalInsumo, ModalEstacao } from './MeuQG.jsx'
import { precificar, validarProduto, rateioFixos, precoUnidadeInsumo, custoGramaFilamento } from '../lib/pricing.js'
import { fmtBRL, fmtHoras, fmtPct, n0, novoId, nomeArquivo } from '../lib/format.js'
import { pdfCalculos } from '../lib/pdf.js'
import { baixarArquivo } from '../lib/files.js'

const NOVO = '__novo__'

function novaPeca(dados, processoPreferido) {
  const imps = Object.values(dados.impressoras)
  const imp = imps.find((i) => i.processo === (processoPreferido || 'fdm')) || imps[0]
  const processo = imp?.processo || processoPreferido || 'fdm'
  const fil = Object.values(dados.filamentos)[0]
  const res = Object.values(dados.resinas)[0]
  const est = Object.values(dados.washcures)[0]
  return {
    id: novoId(),
    nome: '',
    processo,
    impressoraId: imp?.id || '',
    unidadesPorMesa: 1,
    tempoImpressaoHoras: null,
    consumos: [{ filamentoId: fil?.id || '', gramasMesa: null }],
    purgaGramas: 0,
    acabamentoPct: 0,
    reservaFalhasPct: null,
    resinaId: res?.id || '',
    volumeMl: null,
    perdasPct: 0.05,
    tempoLavagemMin: 6,
    tempoCuraMin: 4,
    washCureId: est?.id || '',
  }
}

function novoProduto(dados) {
  return {
    id: '',
    nome: '',
    descricao: '',
    pecas: [novaPeca(dados)],
    insumos: [],
    minutosTrabalho: 15,
    incluirFixos: true,
    markupVarejo: n0(dados.config.precificacao?.markupVarejo) || 2,
    precoFinalVarejo: null,
    noCatalogo: false,
    sku: '',
    fotoId: null,
  }
}

const clonar = (x) => JSON.parse(JSON.stringify(x))
const assinatura = (p) =>
  JSON.stringify({
    nome: p.nome,
    descricao: p.descricao,
    pecas: p.pecas,
    insumos: p.insumos,
    minutosTrabalho: p.minutosTrabalho,
    incluirFixos: p.incluirFixos,
    markupVarejo: p.markupVarejo,
    precoFinalVarejo: p.precoFinalVarejo,
  })

function TempoInput({ horas, onMuda, id }) {
  const totalMin = Number.isFinite(horas) && horas !== null ? Math.round(horas * 60) : null
  const h = totalMin === null ? null : Math.floor(totalMin / 60)
  const m = totalMin === null ? null : totalMin % 60
  const mudar = (novoH, novoM) => {
    if ((novoH === null || novoH === undefined) && (novoM === null || novoM === undefined)) return onMuda(null)
    if (Number.isNaN(novoH) || Number.isNaN(novoM)) return onMuda(NaN)
    onMuda(n0(novoH) + n0(novoM) / 60)
  }
  return (
    <div className="grid-2" style={{ gap: 8 }}>
      <NumInput id={id} valor={h} onMuda={(v) => mudar(v, m)} unidade="h" casas={0} aria-label="Horas de impressão" />
      <NumInput valor={m} onMuda={(v) => mudar(h, v)} unidade="min" casas={0} aria-label="Minutos de impressão" />
    </div>
  )
}

function PecaEditor({ peca, idx, total, custo, dados, onMuda, onRemover, onDuplicar, abrirModal, tentou }) {
  const set = (k, v) => onMuda({ ...peca, [k]: v })
  const imp = dados.impressoras[peca.impressoraId]
  const impressoras = Object.values(dados.impressoras)
  const filamentos = Object.values(dados.filamentos)
  const resinas = Object.values(dados.resinas)
  const estacoes = Object.values(dados.washcures)
  const opcoesImp = [
    { grupo: 'FDM', opcoes: impressoras.filter((i) => i.processo !== 'resina').map((i) => ({ valor: i.id, rotulo: i.nome })) },
    { grupo: 'Resina', opcoes: impressoras.filter((i) => i.processo === 'resina').map((i) => ({ valor: i.id, rotulo: i.nome })) },
    { grupo: 'Cadastro', opcoes: [{ valor: NOVO, rotulo: '+ Cadastrar impressora' }] },
  ].filter((g) => g.opcoes.length)
  const nomeExibido = peca.nome?.trim() || `Peça ${idx + 1}`
  const err = (cond, msg) => (tentou && cond ? msg : null)

  const trocarImpressora = (id) => {
    if (id === NOVO) {
      abrirModal('impressora', (doc) => onMuda({ ...peca, impressoraId: doc.id, processo: doc.processo }))
      return
    }
    const nova = dados.impressoras[id]
    onMuda({ ...peca, impressoraId: id, processo: nova?.processo || peca.processo })
  }

  return (
    <div className="part">
      <div className="part-head">
        <span className="part-num">{String(idx + 1).padStart(2, '0')}</span>
        <input
          className="input"
          style={{ flex: '1 1 180px', minHeight: 34 }}
          value={peca.nome || ''}
          placeholder={total > 1 ? `Nome da peça ${idx + 1} (ex.: tampa)` : 'Nome da peça (opcional)'}
          onChange={(e) => set('nome', e.target.value)}
          aria-label="Nome da peça"
          maxLength={80}
        />
        <Pill tipo={peca.processo === 'resina' ? 'info' : 'accent'}>{peca.processo === 'resina' ? 'Resina' : 'FDM'}</Pill>
        <span className="num small" title="Custo desta peça por unidade">
          {fmtBRL(custo?.total || 0)}/un.
        </span>
        <div className="actions">
          <Btn tamanho="sm" variante="ghost" icone="copiar" aria-label={`Duplicar ${nomeExibido}`} onClick={onDuplicar} />
          {total > 1 && <Btn tamanho="sm" variante="ghost" icone="lixo" aria-label={`Remover ${nomeExibido}`} onClick={onRemover} />}
        </div>
      </div>
      <div className="part-body">
        <div className="grid-3">
          <Selecao rotulo="Impressora" valor={peca.impressoraId} onMuda={trocarImpressora} opcoes={opcoesImp} vazio="Escolha" erro={err(!imp, 'Escolha a impressora.')} />
          <Numero rotulo="Unidades na mesa" unidade="un." valor={peca.unidadesPorMesa} onMuda={(v) => set('unidadesPorMesa', v)} casas={0} erro={err(!(Math.floor(n0(peca.unidadesPorMesa)) >= 1), 'Mínimo 1.')} dica="Quantas saem juntas na mesa." />
          <Field rotulo="Tempo de impressão da mesa" erro={err(!(n0(peca.tempoImpressaoHoras) > 0), 'Informe o tempo.')}>
            <TempoInput horas={peca.tempoImpressaoHoras} onMuda={(v) => set('tempoImpressaoHoras', v)} />
          </Field>
        </div>

        {peca.processo !== 'resina' ? (
          <>
            <div className="stack-sm">
              <div className="inline-grid">
                <span className="field-label small strong">Filamento</span>
                <span className="field-label small strong">Peso na mesa</span>
                <span />
              </div>
              {(peca.consumos || []).map((c, i) => {
                return (
                  <div className="inline-grid" key={i}>
                    <select
                      className="select"
                      value={c.filamentoId || ''}
                      aria-label={`Filamento ${i + 1}`}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === NOVO) {
                          abrirModal('filamento', (doc) => set('consumos', peca.consumos.map((x, j) => (j === i ? { ...x, filamentoId: doc.id } : x))))
                          return
                        }
                        set('consumos', peca.consumos.map((x, j) => (j === i ? { ...x, filamentoId: v } : x)))
                      }}
                    >
                      <option value="">Escolha o filamento</option>
                      {filamentos.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome} · {fmtBRL(custoGramaFilamento(f) * 1000)}/kg
                        </option>
                      ))}
                      <option value={NOVO}>+ Cadastrar filamento</option>
                    </select>
                    <NumInput
                      valor={c.gramasMesa}
                      onMuda={(v) => set('consumos', peca.consumos.map((x, j) => (j === i ? { ...x, gramasMesa: v } : x)))}
                      unidade="g"
                      casas={2}
                      aria-label={`Gramas do filamento ${i + 1}`}
                      invalido={tentou && !(n0(c.gramasMesa) > 0)}
                    />
                    <Btn
                      variante="ghost"
                      icone="fechar"
                      aria-label="Remover filamento"
                      disabled={peca.consumos.length <= 1}
                      onClick={() => set('consumos', peca.consumos.filter((_, j) => j !== i))}
                    />
                  </div>
                )
              })}
              <div className="row">
                <Btn
                  tamanho="sm"
                  icone="mais2"
                  onClick={() => set('consumos', [...(peca.consumos || []), { filamentoId: '', gramasMesa: null }])}
                  disabled={(peca.consumos || []).length >= 20}
                >
                  Adicionar filamento (multicor)
                </Btn>
                <span className="tiny muted">Use o peso com suportes que o fatiador mostra para a mesa inteira.</span>
              </div>
            </div>
            <div className="grid-3">
              <Numero rotulo="Purga (trocas de cor)" unidade="g" valor={peca.purgaGramas} onMuda={(v) => set('purgaGramas', v)} casas={2} dica="Material descartado no AMS/MMU. Não conte duas vezes." />
              <Percentual rotulo="Acabamento" valor={peca.acabamentoPct} onMuda={(v) => set('acabamentoPct', v)} dica="Lixa, primer, tinta: % sobre o material." />
              <ReservaFalhas peca={peca} imp={imp} set={set} />
            </div>
          </>
        ) : (
          <>
            <div className="grid-3">
              <Selecao
                rotulo="Resina"
                valor={peca.resinaId}
                onMuda={(v) => (v === NOVO ? abrirModal('resina', (doc) => set('resinaId', doc.id)) : set('resinaId', v))}
                opcoes={[...resinas.map((r) => ({ valor: r.id, rotulo: r.nome })), { valor: NOVO, rotulo: '+ Cadastrar resina' }]}
                vazio="Escolha"
                erro={err(!peca.resinaId, 'Escolha a resina.')}
              />
              <Numero rotulo="Volume na mesa" unidade="ml" valor={peca.volumeMl} onMuda={(v) => set('volumeMl', v)} casas={2} erro={err(!(n0(peca.volumeMl) > 0), 'Informe o volume.')} dica="Com suportes, como o fatiador mostra." />
              <Percentual rotulo="Perda de resina" valor={peca.perdasPct} onMuda={(v) => set('perdasPct', v)} dica="Resina que fica no tanque e nos suportes." />
            </div>
            <div className="grid-3">
              <Selecao
                rotulo="Lavagem e cura"
                valor={peca.washCureId || ''}
                onMuda={(v) => (v === NOVO ? abrirModal('estacao', (doc) => set('washCureId', doc.id)) : set('washCureId', v))}
                opcoes={[...estacoes.map((w) => ({ valor: w.id, rotulo: w.nome })), { valor: NOVO, rotulo: '+ Cadastrar estação' }]}
                vazio="Sem estação"
              />
              <Field rotulo="Tempos de pós-cura">
                <div className="grid-2" style={{ gap: 8 }}>
                  <NumInput valor={peca.tempoLavagemMin} onMuda={(v) => set('tempoLavagemMin', v)} unidade="lav." casas={0} aria-label="Minutos de lavagem" />
                  <NumInput valor={peca.tempoCuraMin} onMuda={(v) => set('tempoCuraMin', v)} unidade="cura" casas={0} aria-label="Minutos de cura" />
                </div>
              </Field>
              <ReservaFalhas peca={peca} imp={imp} set={set} />
            </div>
          </>
        )}
        {custo?.avisos?.length > 0 && <Aviso tipo="warn">{custo.avisos.join(' ')}</Aviso>}
      </div>
    </div>
  )
}

function ReservaFalhas({ peca, imp, set }) {
  const padrao = imp ? n0(imp.falhasPct) : 0
  const usandoPadrao = peca.reservaFalhasPct === null || peca.reservaFalhasPct === undefined
  return (
    <div className="field">
      <span className="field-label">Reserva para falhas</span>
      {usandoPadrao ? (
        <div className="row" style={{ minHeight: 40 }}>
          <span className="num">{fmtPct(padrao)}</span>
          <span className="tiny muted">padrão da impressora</span>
          <button type="button" className="linklike small" onClick={() => set('reservaFalhasPct', padrao)}>
            Ajustar nesta peça
          </button>
        </div>
      ) : (
        <div className="stack-sm">
          <NumInput
            valor={Math.round(n0(peca.reservaFalhasPct) * 1e6) / 1e4}
            onMuda={(v) => set('reservaFalhasPct', v === null || Number.isNaN(v) ? v : v / 100)}
            unidade="%"
            casas={2}
            aria-label="Reserva para falhas nesta peça"
          />
          <button type="button" className="linklike muted tiny" style={{ alignSelf: 'flex-start' }} onClick={() => set('reservaFalhasPct', null)}>
            Voltar ao padrão ({fmtPct(padrao)})
          </button>
        </div>
      )}
    </div>
  )
}

export default function Calculadora({ params, ir }) {
  const { dados, ctx, api } = useStore()
  const toast = useToast()
  const original = params?.produtoId ? dados.produtos[params.produtoId] : null
  const [form, setForm] = useState(() => {
    if (original) return clonar(original)
    if (params?.copiarDe && dados.produtos[params.copiarDe]) {
      const base = clonar(dados.produtos[params.copiarDe])
      return { ...base, id: '', nome: `${base.nome} (cópia)`, sku: '', noCatalogo: false, fotoId: null, criadoEm: undefined, exemplo: undefined }
    }
    return novoProduto(dados)
  })
  const [salvo, setSalvo] = useState(() => (original ? assinatura(original) : null))
  const [tentou, setTentou] = useState(false)
  const [modal, setModal] = useState(null)
  const [gerando, setGerando] = useState(false)

  const res = useMemo(() => precificar(form, ctx), [form, ctx])
  const erro = validarProduto(form, { exigirNome: true })
  const alterado = salvo !== assinatura(form)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const rateio = rateioFixos(ctx)
  const semImpressora = !Object.keys(dados.impressoras).length
  const semMaterial = !Object.keys(dados.filamentos).length && !Object.keys(dados.resinas).length

  const abrirModal = (tipo, onSalvo) => setModal({ tipo, onSalvo })

  const salvar = (promover) => {
    setTentou(true)
    if (erro) {
      toast(erro, 'bad')
      return
    }
    const doc = api.salvar('produtos', {
      ...form,
      nome: form.nome.trim(),
      descricao: (form.descricao || '').trim(),
      noCatalogo: promover ? true : !!form.noCatalogo,
      precoFinalVarejo: Number.isFinite(form.precoFinalVarejo) && form.precoFinalVarejo > 0 ? form.precoFinalVarejo : null,
    })
    setSalvo(assinatura(doc))
    setForm(doc)
    toast(promover && !form.noCatalogo ? 'Cálculo salvo e promovido ao catálogo' : 'Cálculo salvo')
    if (!form.id) ir('calculadora', { produtoId: doc.id })
  }

  const exportarPDF = async () => {
    setGerando(true)
    try {
      const blob = await pdfCalculos([{ produto: form, res }], dados.config)
      const r = await baixarArquivo(`calculo-${nomeArquivo(form.nome || 'produto')}.pdf`, blob)
      if (r === 'salvo') toast('PDF do cálculo pronto')
    } catch (e) {
      toast(e.message || 'Não foi possível gerar o PDF.', 'bad')
    } finally {
      setGerando(false)
    }
  }

  const mudarPeca = (i, p) => setForm((f) => ({ ...f, pecas: f.pecas.map((x, j) => (j === i ? p : x)) }))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <button type="button" className="linklike muted small" onClick={() => ir('calculos')} style={{ alignSelf: 'flex-start' }}>
            ← Cálculos
          </button>
          <h1>{original ? form.nome || 'Cálculo' : 'Novo cálculo'}</h1>
          <p>Peso e tempo vêm do fatiador. Máquina, energia, material e insumos vêm do Meu QG.</p>
        </div>
        <div className="actions">
          {alterado && original && <Pill tipo="warn">Alterações não salvas</Pill>}
          {form.noCatalogo && (
            <Pill tipo="accent">
              <Icon nome="estrela" tamanho={13} preenchido /> No catálogo
            </Pill>
          )}
        </div>
      </div>

      {(semImpressora || semMaterial) && (
        <Aviso tipo="warn">
          <div className="stack-sm">
            <span>
              {semImpressora && semMaterial
                ? 'Para calcular, cadastre uma impressora e um material.'
                : semImpressora
                  ? 'Cadastre uma impressora para calcular máquina, energia e manutenção.'
                  : 'Cadastre um filamento ou resina para calcular o material.'}
            </span>
            <div className="actions">
              {semImpressora && (
                <Btn tamanho="sm" icone="mais2" onClick={() => abrirModal('impressora', (doc) => setForm((f) => ({ ...f, pecas: f.pecas.map((p) => (p.impressoraId ? p : { ...p, impressoraId: doc.id, processo: doc.processo })) })))}>
                  Cadastrar impressora
                </Btn>
              )}
              {semMaterial && (
                <Btn tamanho="sm" icone="mais2" onClick={() => abrirModal('filamento', (doc) => setForm((f) => ({ ...f, pecas: f.pecas.map((p) => ({ ...p, consumos: p.consumos.map((c) => (c.filamentoId ? c : { ...c, filamentoId: doc.id })) })) })))}>
                  Cadastrar filamento
                </Btn>
              )}
            </div>
          </div>
        </Aviso>
      )}

      <div className="split">
        <div className="stack">
          <section className="card stack">
            <div className="grid-2">
              <Texto rotulo="Nome do produto" valor={form.nome} onMuda={(v) => set('nome', v)} placeholder="Ex.: Luminária geométrica" erro={tentou && !form.nome.trim() ? 'Dê um nome ao produto.' : null} maxLength={120} />
              <Texto rotulo="Descrição (opcional)" valor={form.descricao} onMuda={(v) => set('descricao', v)} placeholder="Medidas, cores, detalhes" maxLength={400} />
            </div>
          </section>

          <div className="stack-sm">
            <div className="row between">
              <h3>Peças</h3>
              <span className="tiny muted">{fmtHoras(res.horasImpressao)} de impressora por unidade</span>
            </div>
            {form.pecas.map((p, i) => (
              <PecaEditor
                key={p.id || i}
                peca={p}
                idx={i}
                total={form.pecas.length}
                custo={res.pecas[i]?.custo}
                dados={dados}
                tentou={tentou}
                abrirModal={abrirModal}
                onMuda={(np) => mudarPeca(i, np)}
                onRemover={() => setForm((f) => ({ ...f, pecas: f.pecas.filter((_, j) => j !== i) }))}
                onDuplicar={() => setForm((f) => ({ ...f, pecas: [...f.pecas.slice(0, i + 1), { ...clonar(p), id: novoId(), nome: p.nome ? `${p.nome} (cópia)` : '' }, ...f.pecas.slice(i + 1)] }))}
              />
            ))}
            <div className="row">
              <Btn icone="mais2" onClick={() => setForm((f) => ({ ...f, pecas: [...f.pecas, novaPeca(dados, f.pecas[f.pecas.length - 1]?.processo)] }))} disabled={form.pecas.length >= 50}>
                Adicionar peça
              </Btn>
              <span className="tiny muted">Para produtos montados com partes diferentes (ex.: base + cúpula).</span>
            </div>
          </div>

          <section className="card stack">
            <div className="row between">
              <h3>Insumos</h3>
              <span className="num small">{fmtBRL(res.insumos.total)}</span>
            </div>
            {form.insumos.length > 0 && (
              <div className="stack-sm">
                {form.insumos.map((it, i) => {
                  const ins = dados.insumos[it.insumoId]
                  return (
                    <div className="ins-row" key={i}>
                      <select
                        className="select"
                        value={it.insumoId || ''}
                        aria-label={`Insumo ${i + 1}`}
                        onChange={(e) => {
                          const v = e.target.value
                          if (v === NOVO) {
                            abrirModal('insumo', (doc) => set('insumos', form.insumos.map((x, j) => (j === i ? { ...x, insumoId: doc.id } : x))))
                            return
                          }
                          set('insumos', form.insumos.map((x, j) => (j === i ? { ...x, insumoId: v } : x)))
                        }}
                      >
                        <option value="">Escolha o insumo</option>
                        {Object.values(dados.insumos).map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nome} · {fmtBRL(precoUnidadeInsumo(x))}/{x.unidade}
                          </option>
                        ))}
                        <option value={NOVO}>+ Cadastrar insumo</option>
                      </select>
                      <NumInput
                        valor={it.quantidade}
                        onMuda={(v) => set('insumos', form.insumos.map((x, j) => (j === i ? { ...x, quantidade: v } : x)))}
                        unidade={ins?.unidade || 'un'}
                        casas={3}
                        aria-label="Quantidade"
                        invalido={tentou && !(n0(it.quantidade) > 0)}
                      />
                      <span className="num small right">{fmtBRL(precoUnidadeInsumo(ins) * n0(it.quantidade))}</span>
                      <Btn variante="ghost" icone="fechar" aria-label="Remover insumo" onClick={() => set('insumos', form.insumos.filter((_, j) => j !== i))} />
                    </div>
                  )
                })}
              </div>
            )}
            <div className="row">
              <Btn tamanho="sm" icone="mais2" onClick={() => set('insumos', [...form.insumos, { insumoId: Object.values(dados.insumos)[0]?.id || '', quantidade: 1 }])}>
                Adicionar insumo
              </Btn>
              <span className="tiny muted">Embalagem, ímãs, argolas, álcool… Para itens divididos, use a fração (ex.: 0,5 m).</span>
            </div>
          </section>

          <section className="card stack">
            <h3>Trabalho e custos fixos</h3>
            <div className="grid-2">
              <Numero
                rotulo="Trabalho manual"
                unidade="min"
                valor={form.minutosTrabalho}
                onMuda={(v) => set('minutosTrabalho', v)}
                casas={1}
                dica={`Montagem, acabamento e embalagem de uma unidade. Sua hora: ${fmtBRL(ctx.custoHoraTrabalho)} → ${fmtBRL(res.maoDeObra)}.`}
              />
              <div className="field">
                <span className="field-label">Custos fixos do mês</span>
                {rateio > 0 ? (
                  <Check marcado={form.incluirFixos !== false} onMuda={(v) => set('incluirFixos', v)}>
                    Incluir rateio de <strong className="num">{fmtBRL(rateio)}</strong> por unidade
                  </Check>
                ) : (
                  <p className="small muted">
                    Sem custos fixos cadastrados.{' '}
                    <button type="button" className="linklike" onClick={() => ir('negocio', { secao: 'fixos' })}>
                      Cadastrar em Meu negócio
                    </button>
                  </p>
                )}
              </div>
            </div>
          </section>

          {tentou && erro && <Aviso tipo="bad">{erro}</Aviso>}

          <div className="actions">
            <Btn variante="primary" icone="check" onClick={() => salvar(false)}>
              Salvar cálculo
            </Btn>
            {!form.noCatalogo && (
              <Btn icone="estrela" onClick={() => salvar(true)}>
                Salvar e promover ao catálogo
              </Btn>
            )}
            <Btn icone="baixar" onClick={exportarPDF} disabled={gerando}>
              {gerando ? 'Gerando…' : 'PDF do cálculo'}
            </Btn>
            {original && (
              <Btn variante="ghost" icone="copiar" onClick={() => ir('calculadora', { copiarDe: original.id })}>
                Duplicar
              </Btn>
            )}
          </div>
        </div>

        <div className="sticky">
          <PainelPreco
            res={res}
            imposto={ctx.impostoPct}
            editavel
            markup={form.markupVarejo}
            onMarkup={(v) => set('markupVarejo', v)}
            precoManual={form.precoFinalVarejo}
            onPrecoManual={(v) => set('precoFinalVarejo', v === null || Number.isNaN(v) ? null : v)}
          />
        </div>
      </div>

      <div className="mobile-total">
        <div className="stack-sm" style={{ gap: 0 }}>
          <span className="tiny" style={{ opacity: 0.7 }}>
            Preço · margem {fmtPct(res.margem)}
          </span>
          <span className="num strong" style={{ fontSize: '1.15rem' }}>
            {fmtBRL(res.preco)}
          </span>
        </div>
        <Btn variante="primary" tamanho="sm" icone="check" onClick={() => salvar(false)}>
          Salvar
        </Btn>
      </div>

      <ModalImpressora aberto={modal?.tipo === 'impressora'} onFechar={() => setModal(null)} onSalvo={modal?.onSalvo} />
      <ModalFilamento aberto={modal?.tipo === 'filamento'} onFechar={() => setModal(null)} onSalvo={modal?.onSalvo} />
      <ModalResina aberto={modal?.tipo === 'resina'} onFechar={() => setModal(null)} onSalvo={modal?.onSalvo} />
      <ModalInsumo aberto={modal?.tipo === 'insumo'} onFechar={() => setModal(null)} onSalvo={modal?.onSalvo} />
      <ModalEstacao aberto={modal?.tipo === 'estacao'} onFechar={() => setModal(null)} onSalvo={modal?.onSalvo} />
    </div>
  )
}

export { novoProduto, novaPeca }
