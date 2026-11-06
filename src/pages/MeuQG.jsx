import { useEffect, useMemo, useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Check, Field, Modal, Numero, Percentual, Selecao, Seg, Texto, Abas, Vazio, Aviso, useConfirmar, Pill } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { MODELOS_IMPRESSORA, MODELOS_LAVAGEM_CURA, TIPOS_FILAMENTO, TIPOS_RESINA, UNIDADES_INSUMO, SUGESTOES_INSUMO } from '../lib/defaults.js'
import {
  NIVEIS_USO,
  LCD_PADRAO,
  FEP_PADRAO,
  custoHoraMaquina,
  custoHoraManutencao,
  pctManutencao,
  custoGramaFilamento,
  custoLitroResina,
  precoUnidadeInsumo,
  MANUTENCAO_ANUAL_LAVAGEM_CURA,
} from '../lib/pricing.js'
import { fmtBRL, fmtNum, fmtPct, n0, novoId } from '../lib/format.js'
import ImportarMateriais from '../components/ImportarMateriais.jsx'
import { baixarArquivo } from '../lib/files.js'
import { nomeArquivoMateriais, valorEstoque, xlsxMateriais } from '../lib/materiais.js'

// Estoque é opcional: vazio = não informado; 0 ou mais = quantidade em mãos.
const erroEstoque = (v) => (v === null || v === undefined ? null : Number.isFinite(v) && v >= 0 ? null : 'Use 0 ou mais (ou deixe vazio).')

function fmtEstoque(v, um, varios) {
  if (!Number.isFinite(v)) return '—'
  return `${fmtNum(v)} ${v === 1 ? um : varios}`.trim()
}

const ok = (v) => Number.isFinite(v)

function usosDe(dados, tipo, id) {
  return Object.values(dados.produtos).filter((p) =>
    tipo === 'insumos'
      ? (p.insumos || []).some((i) => i.insumoId === id)
      : (p.pecas || []).some((pc) =>
          tipo === 'impressoras'
            ? pc.impressoraId === id
            : tipo === 'washcures'
              ? pc.washCureId === id
              : tipo === 'filamentos'
                ? (pc.consumos || []).some((c) => c.filamentoId === id)
                : pc.resinaId === id,
        ),
  ).length
}

// ---------- Impressora ----------

function impressoraVazia(processo = 'fdm') {
  return {
    id: '',
    nome: '',
    modelo: '',
    processo,
    valor: null,
    potenciaW: null,
    amortizacao: { modo: 'prazo', meses: 12, horas: 3000 },
    horasPorDia: 8,
    diasPorMes: 22,
    nivelUso: 'medio',
    falhasPct: processo === 'resina' ? 0.08 : 0.05,
    lcd: { ...LCD_PADRAO },
    fep: { ...FEP_PADRAO },
  }
}

export function ModalImpressora({ aberto, onFechar, inicial, processoPadrao, onSalvo }) {
  const { api, dados } = useStore()
  const toast = useToast()
  const [f, setF] = useState(() => impressoraVazia(processoPadrao))
  const [tentou, setTentou] = useState(false)
  useEffect(() => {
    if (aberto) {
      setF(inicial ? { ...impressoraVazia(inicial.processo), ...inicial } : impressoraVazia(processoPadrao))
      setTentou(false)
    }
  }, [aberto, inicial, processoPadrao])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const setA = (k, v) => setF((x) => ({ ...x, amortizacao: { ...x.amortizacao, [k]: v } }))
  const tarifa = n0(dados.config.custos.tarifaKwh)

  const erros = {
    nome: !String(f.nome || '').trim() ? 'Dê um nome para identificar a impressora.' : null,
    valor: !(ok(f.valor) && f.valor > 0) ? 'Informe o valor pago.' : null,
    potenciaW: !(ok(f.potenciaW) && f.potenciaW > 0) ? 'Informe o consumo médio.' : null,
    meses: f.amortizacao.modo === 'prazo' && !(ok(f.amortizacao.meses) && f.amortizacao.meses >= 1 && f.amortizacao.meses <= 600) ? 'Entre 1 e 600 meses.' : null,
    horas: f.amortizacao.modo === 'vidaUtil' && !(ok(f.amortizacao.horas) && f.amortizacao.horas > 0) ? 'Informe as horas de vida útil.' : null,
    horasPorDia: !(ok(f.horasPorDia) && f.horasPorDia >= 0.01 && f.horasPorDia <= 24) ? 'Entre 0,01 e 24 horas.' : null,
    diasPorMes: !(ok(f.diasPorMes) && f.diasPorMes >= 1 && f.diasPorMes <= 31) ? 'Entre 1 e 31 dias.' : null,
    falhasPct: !(ok(f.falhasPct) && f.falhasPct >= 0 && f.falhasPct <= 1) ? 'Entre 0% e 100%.' : null,
  }
  const temErro = Object.values(erros).some(Boolean)
  const e = (k) => (tentou ? erros[k] : null)

  const modelos = [
    { grupo: 'FDM (filamento)', opcoes: MODELOS_IMPRESSORA.filter((m) => m.processo === 'fdm').map((m) => ({ valor: m.id, rotulo: m.nome })) },
    { grupo: 'Resina', opcoes: MODELOS_IMPRESSORA.filter((m) => m.processo === 'resina').map((m) => ({ valor: m.id, rotulo: m.nome })) },
    { grupo: 'Outra', opcoes: [{ valor: 'outra', rotulo: 'Outra impressora (digitar)' }] },
  ]

  const escolherModelo = (id) => {
    const m = MODELOS_IMPRESSORA.find((x) => x.id === id)
    if (!m) {
      setF((x) => ({ ...x, modelo: id }))
      return
    }
    setF((x) => ({
      ...x,
      modelo: id,
      nome: x.nome && x.nome !== MODELOS_IMPRESSORA.find((mm) => mm.id === x.modelo)?.nome ? x.nome : m.nome,
      processo: m.processo,
      valor: m.valor,
      potenciaW: m.potenciaW,
      falhasPct: x.falhasPct ?? (m.processo === 'resina' ? 0.08 : 0.05),
    }))
  }

  const salvar = () => {
    setTentou(true)
    if (temErro) return
    const doc = api.salvar('impressoras', { ...f, id: f.id || novoId(), nome: f.nome.trim() })
    toast(inicial ? 'Impressora atualizada' : 'Impressora cadastrada')
    onSalvo?.(doc)
    onFechar()
  }

  const prev = { ...f, valor: n0(f.valor), potenciaW: n0(f.potenciaW) }
  const hMaq = custoHoraMaquina(prev)
  const hMan = custoHoraManutencao(prev, pctManutencao(prev))
  const hEn = (n0(f.potenciaW) / 1000) * tarifa

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      largo
      titulo={inicial ? 'Editar impressora' : 'Nova impressora'}
      subtitulo="Os valores sugeridos são referências. Confira o valor que você pagou e o consumo médio."
      rodape={
        <>
          <Btn onClick={onFechar}>Cancelar</Btn>
          <Btn variante="primary" onClick={salvar}>
            Salvar impressora
          </Btn>
        </>
      }
    >
      <div className="grid-2">
        <Selecao rotulo="Modelo" valor={f.modelo} onMuda={escolherModelo} opcoes={modelos} vazio="Escolha um modelo" />
        <Texto rotulo="Nome" valor={f.nome} onMuda={(v) => set('nome', v)} erro={e('nome')} placeholder="Ex.: A1 da bancada" maxLength={80} />
      </div>
      <Field rotulo="Processo">
        <Seg valor={f.processo} onMuda={(v) => set('processo', v)} opcoes={[{ valor: 'fdm', rotulo: 'FDM (filamento)' }, { valor: 'resina', rotulo: 'Resina' }]} rotulo="Processo" />
      </Field>
      <div className="grid-2">
        <Numero rotulo="Valor pago" prefixo="R$" valor={f.valor} onMuda={(v) => set('valor', v)} erro={e('valor')} casas={2} />
        <Numero rotulo="Consumo médio" unidade="W" valor={f.potenciaW} onMuda={(v) => set('potenciaW', v)} erro={e('potenciaW')} dica="Durante a impressão, não a potência máxima da fonte." casas={1} />
      </div>
      <Field rotulo="Como a máquina se paga">
        <Seg
          valor={f.amortizacao.modo}
          onMuda={(v) => setA('modo', v)}
          opcoes={[
            { valor: 'prazo', rotulo: 'Em um prazo (meses)' },
            { valor: 'vidaUtil', rotulo: 'Pela vida útil (horas)' },
          ]}
          rotulo="Amortização"
        />
      </Field>
      <div className="grid-3">
        {f.amortizacao.modo === 'prazo' ? (
          <Numero rotulo="Prazo para se pagar" unidade="meses" valor={f.amortizacao.meses} onMuda={(v) => setA('meses', v)} erro={e('meses')} casas={0} />
        ) : (
          <Numero rotulo="Vida útil" unidade="horas" valor={f.amortizacao.horas} onMuda={(v) => setA('horas', v)} erro={e('horas')} casas={0} />
        )}
        <Numero rotulo="Uso por dia" unidade="h" valor={f.horasPorDia} onMuda={(v) => set('horasPorDia', v)} erro={e('horasPorDia')} casas={2} />
        <Numero rotulo="Dias por mês" unidade="dias" valor={f.diasPorMes} onMuda={(v) => set('diasPorMes', v)} erro={e('diasPorMes')} casas={0} />
      </div>
      <div className="grid-2">
        <Selecao
          rotulo="Nível de uso"
          valor={f.nivelUso}
          onMuda={(v) => set('nivelUso', v)}
          opcoes={NIVEIS_USO.map((n) => ({ valor: n.valor, rotulo: `${n.rotulo}: ${n.desc}` }))}
          dica={`Reserva ${fmtPct(pctManutencao(f))} do valor da máquina por ano para peças e reparos.`}
        />
        <Percentual rotulo="Reserva para falhas" valor={f.falhasPct} onMuda={(v) => set('falhasPct', v)} erro={e('falhasPct')} dica="Acréscimo padrão para cobrir impressões perdidas." />
      </div>
      {f.processo === 'resina' && (
        <div className="grid-2">
          <div className="well stack-sm">
            <span className="strong small">Tela LCD</span>
            <div className="grid-2">
              <Numero rotulo="Preço" prefixo="R$" valor={f.lcd?.preco} onMuda={(v) => set('lcd', { ...f.lcd, preco: v })} casas={2} />
              <Numero rotulo="Vida útil" unidade="h" valor={f.lcd?.vidaHoras} onMuda={(v) => set('lcd', { ...f.lcd, vidaHoras: v })} casas={0} />
            </div>
          </div>
          <div className="well stack-sm">
            <span className="strong small">Filme FEP</span>
            <div className="grid-2">
              <Numero rotulo="Preço" prefixo="R$" valor={f.fep?.preco} onMuda={(v) => set('fep', { ...f.fep, preco: v })} casas={2} />
              <Numero rotulo="Dura" unidade="impr." valor={f.fep?.vidaImpressoes} onMuda={(v) => set('fep', { ...f.fep, vidaImpressoes: v })} casas={0} />
            </div>
          </div>
        </div>
      )}
      <div className="well">
        <div className="grid-3">
          <div className="stat">
            <span className="label">Máquina</span>
            <span className="num strong">{fmtBRL(hMaq)}/h</span>
          </div>
          <div className="stat">
            <span className="label">Manutenção</span>
            <span className="num strong">{fmtBRL(hMan)}/h</span>
          </div>
          <div className="stat">
            <span className="label">Energia</span>
            <span className="num strong">{fmtBRL(hEn)}/h</span>
          </div>
        </div>
        <p className="tiny muted" style={{ marginTop: 8 }}>
          Por hora de impressão, com a tarifa de {fmtBRL(tarifa)}/kWh de Meu negócio.
        </p>
      </div>
    </Modal>
  )
}

// ---------- Estação de lavagem e cura ----------

function estacaoVazia() {
  return { id: '', nome: '', modelo: '', valor: null, potenciaW: null, amortizacao: { modo: 'prazo', meses: 24, horas: 2000 }, horasPorDia: 2, diasPorMes: 22 }
}

export function ModalEstacao({ aberto, onFechar, inicial, onSalvo }) {
  const { api } = useStore()
  const toast = useToast()
  const [f, setF] = useState(estacaoVazia)
  const [tentou, setTentou] = useState(false)
  useEffect(() => {
    if (aberto) {
      setF(inicial ? { ...estacaoVazia(), ...inicial } : estacaoVazia())
      setTentou(false)
    }
  }, [aberto, inicial])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const setA = (k, v) => setF((x) => ({ ...x, amortizacao: { ...x.amortizacao, [k]: v } }))
  const erros = {
    nome: !String(f.nome || '').trim() ? 'Dê um nome.' : null,
    valor: !(ok(f.valor) && f.valor > 0) ? 'Informe o valor pago.' : null,
    potenciaW: !(ok(f.potenciaW) && f.potenciaW > 0) ? 'Informe o consumo.' : null,
    meses: f.amortizacao.modo === 'prazo' && !(ok(f.amortizacao.meses) && f.amortizacao.meses >= 1) ? 'Informe o prazo.' : null,
    horasPorDia: !(ok(f.horasPorDia) && f.horasPorDia > 0 && f.horasPorDia <= 24) ? 'Entre 0,01 e 24 h.' : null,
    diasPorMes: !(ok(f.diasPorMes) && f.diasPorMes >= 1 && f.diasPorMes <= 31) ? 'Entre 1 e 31.' : null,
  }
  const e = (k) => (tentou ? erros[k] : null)
  const salvar = () => {
    setTentou(true)
    if (Object.values(erros).some(Boolean)) return
    const doc = api.salvar('washcures', { ...f, id: f.id || novoId(), nome: f.nome.trim() })
    toast('Estação salva')
    onSalvo?.(doc)
    onFechar()
  }
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={inicial ? 'Editar estação de lavagem e cura' : 'Nova estação de lavagem e cura'}
      rodape={
        <>
          <Btn onClick={onFechar}>Cancelar</Btn>
          <Btn variante="primary" onClick={salvar}>
            Salvar estação
          </Btn>
        </>
      }
    >
      <Selecao
        rotulo="Modelo"
        valor={f.modelo}
        vazio="Escolha um modelo ou digite abaixo"
        onMuda={(id) => {
          const m = MODELOS_LAVAGEM_CURA.find((x) => x.id === id)
          setF((x) => ({ ...x, modelo: id, ...(m ? { nome: m.nome, valor: m.valor, potenciaW: m.potenciaW } : {}) }))
        }}
        opcoes={MODELOS_LAVAGEM_CURA.map((m) => ({ valor: m.id, rotulo: m.nome }))}
      />
      <Texto rotulo="Nome" valor={f.nome} onMuda={(v) => set('nome', v)} erro={e('nome')} maxLength={80} />
      <div className="grid-2">
        <Numero rotulo="Valor pago" prefixo="R$" valor={f.valor} onMuda={(v) => set('valor', v)} erro={e('valor')} casas={2} />
        <Numero rotulo="Consumo médio" unidade="W" valor={f.potenciaW} onMuda={(v) => set('potenciaW', v)} erro={e('potenciaW')} casas={1} />
      </div>
      <div className="grid-3">
        <Numero rotulo="Prazo para se pagar" unidade="meses" valor={f.amortizacao.meses} onMuda={(v) => setA('meses', v)} erro={e('meses')} casas={0} />
        <Numero rotulo="Uso por dia" unidade="h" valor={f.horasPorDia} onMuda={(v) => set('horasPorDia', v)} erro={e('horasPorDia')} casas={2} />
        <Numero rotulo="Dias por mês" unidade="dias" valor={f.diasPorMes} onMuda={(v) => set('diasPorMes', v)} erro={e('diasPorMes')} casas={0} />
      </div>
      <p className="tiny muted">A manutenção da estação reserva {fmtPct(MANUTENCAO_ANUAL_LAVAGEM_CURA)} do valor por ano. O tempo de lavagem e de cura vem de cada peça.</p>
    </Modal>
  )
}

// ---------- Filamento ----------

function filamentoVazio() {
  return { id: '', nome: '', tipo: 'PLA', marca: '', cor: '#3a3f44', fornecedor: '', custoCarretel: 110, pesoCarretelG: 1000 }
}

export function ModalFilamento({ aberto, onFechar, inicial, onSalvo }) {
  const { api } = useStore()
  const toast = useToast()
  const [f, setF] = useState(filamentoVazio)
  const [tentou, setTentou] = useState(false)
  useEffect(() => {
    if (aberto) {
      setF(inicial ? { ...filamentoVazio(), ...inicial } : filamentoVazio())
      setTentou(false)
    }
  }, [aberto, inicial])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const erros = {
    nome: !String(f.nome || '').trim() ? 'Dê um nome (ex.: PLA Preto).' : null,
    custoCarretel: !(ok(f.custoCarretel) && f.custoCarretel > 0) ? 'Informe o preço do carretel.' : null,
    pesoCarretelG: !(ok(f.pesoCarretelG) && f.pesoCarretelG > 0) ? 'Informe o peso do carretel.' : null,
    estoque: erroEstoque(f.estoque),
  }
  const e = (k) => (tentou ? erros[k] : null)
  const salvar = () => {
    setTentou(true)
    if (Object.values(erros).some(Boolean)) return
    const doc = api.salvar('filamentos', { ...f, id: f.id || novoId(), nome: f.nome.trim() })
    toast(inicial ? 'Filamento atualizado' : 'Filamento cadastrado')
    onSalvo?.(doc)
    onFechar()
  }
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={inicial ? 'Editar filamento' : 'Novo filamento'}
      rodape={
        <>
          <Btn onClick={onFechar}>Cancelar</Btn>
          <Btn variante="primary" onClick={salvar}>
            Salvar filamento
          </Btn>
        </>
      }
    >
      <div className="grid-2">
        <Selecao
          rotulo="Tipo"
          valor={f.tipo}
          onMuda={(v) => {
            const t = TIPOS_FILAMENTO.find((x) => x.tipo === v)
            setF((x) => ({ ...x, tipo: v, custoCarretel: !inicial && t?.preco ? t.preco : x.custoCarretel }))
          }}
          opcoes={TIPOS_FILAMENTO.map((t) => ({ valor: t.tipo, rotulo: t.tipo }))}
        />
        <Texto rotulo="Nome" valor={f.nome} onMuda={(v) => set('nome', v)} erro={e('nome')} placeholder="Ex.: PLA Preto" maxLength={80} />
      </div>
      <div className="grid-3">
        <Texto rotulo="Marca" valor={f.marca} onMuda={(v) => set('marca', v)} maxLength={60} />
        <Texto rotulo="Fornecedor" valor={f.fornecedor} onMuda={(v) => set('fornecedor', v)} maxLength={60} />
        <Field rotulo="Cor" htmlFor="fil-cor">
          <input id="fil-cor" type="color" className="input" style={{ padding: 4, height: 40 }} value={f.cor || '#3a3f44'} onChange={(ev) => set('cor', ev.target.value)} />
        </Field>
      </div>
      <div className="grid-3">
        <Numero rotulo="Preço do carretel" prefixo="R$" valor={f.custoCarretel} onMuda={(v) => set('custoCarretel', v)} erro={e('custoCarretel')} casas={2} dica="Inclua o frete, se pagou." />
        <Numero rotulo="Peso do carretel" unidade="g" valor={f.pesoCarretelG} onMuda={(v) => set('pesoCarretelG', v)} erro={e('pesoCarretelG')} casas={0} dica="Só o filamento, sem o carretel." />
        <Numero rotulo="Em estoque" unidade="carretéis" valor={f.estoque ?? null} onMuda={(v) => set('estoque', v)} erro={e('estoque')} casas={2} placeholder="—" dica="Opcional." />
      </div>
      <p className="small muted">
        Sai a <strong className="num">{fmtBRL(custoGramaFilamento(f) * 1000)}/kg</strong> · <span className="num">{fmtBRL(custoGramaFilamento(f))}</span> por grama.
      </p>
    </Modal>
  )
}

// ---------- Resina ----------

function resinaVazia() {
  return { id: '', nome: '', tipo: 'Standard', marca: '', cor: '#9aa0a4', fornecedor: '', custoFrasco: 180, volumeFrascoMl: 1000 }
}

export function ModalResina({ aberto, onFechar, inicial, onSalvo }) {
  const { api } = useStore()
  const toast = useToast()
  const [f, setF] = useState(resinaVazia)
  const [tentou, setTentou] = useState(false)
  useEffect(() => {
    if (aberto) {
      setF(inicial ? { ...resinaVazia(), ...inicial } : resinaVazia())
      setTentou(false)
    }
  }, [aberto, inicial])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const erros = {
    nome: !String(f.nome || '').trim() ? 'Dê um nome.' : null,
    custoFrasco: !(ok(f.custoFrasco) && f.custoFrasco > 0) ? 'Informe o preço.' : null,
    volumeFrascoMl: !(ok(f.volumeFrascoMl) && f.volumeFrascoMl > 0) ? 'Informe o volume.' : null,
    estoque: erroEstoque(f.estoque),
  }
  const e = (k) => (tentou ? erros[k] : null)
  const salvar = () => {
    setTentou(true)
    if (Object.values(erros).some(Boolean)) return
    const doc = api.salvar('resinas', { ...f, id: f.id || novoId(), nome: f.nome.trim() })
    toast(inicial ? 'Resina atualizada' : 'Resina cadastrada')
    onSalvo?.(doc)
    onFechar()
  }
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={inicial ? 'Editar resina' : 'Nova resina'}
      rodape={
        <>
          <Btn onClick={onFechar}>Cancelar</Btn>
          <Btn variante="primary" onClick={salvar}>
            Salvar resina
          </Btn>
        </>
      }
    >
      <div className="grid-2">
        <Selecao rotulo="Tipo" valor={f.tipo} onMuda={(v) => set('tipo', v)} opcoes={TIPOS_RESINA.map((t) => ({ valor: t, rotulo: t }))} />
        <Texto rotulo="Nome" valor={f.nome} onMuda={(v) => set('nome', v)} erro={e('nome')} placeholder="Ex.: Resina Standard Cinza" maxLength={80} />
      </div>
      <div className="grid-3">
        <Texto rotulo="Marca" valor={f.marca} onMuda={(v) => set('marca', v)} maxLength={60} />
        <Texto rotulo="Fornecedor" valor={f.fornecedor} onMuda={(v) => set('fornecedor', v)} maxLength={60} />
        <Field rotulo="Cor" htmlFor="res-cor">
          <input id="res-cor" type="color" className="input" style={{ padding: 4, height: 40 }} value={f.cor || '#9aa0a4'} onChange={(ev) => set('cor', ev.target.value)} />
        </Field>
      </div>
      <div className="grid-3">
        <Numero rotulo="Preço do frasco" prefixo="R$" valor={f.custoFrasco} onMuda={(v) => set('custoFrasco', v)} erro={e('custoFrasco')} casas={2} />
        <Numero rotulo="Volume do frasco" unidade="ml" valor={f.volumeFrascoMl} onMuda={(v) => set('volumeFrascoMl', v)} erro={e('volumeFrascoMl')} casas={0} />
        <Numero rotulo="Em estoque" unidade="frascos" valor={f.estoque ?? null} onMuda={(v) => set('estoque', v)} erro={e('estoque')} casas={2} placeholder="—" dica="Opcional." />
      </div>
      <p className="small muted">
        Sai a <strong className="num">{fmtBRL(custoLitroResina(f))}/litro</strong>.
      </p>
    </Modal>
  )
}

// ---------- Insumo ----------

function insumoVazio() {
  return { id: '', nome: '', unidade: 'un', precoEmbalagem: null, qtdEmbalagem: 1 }
}

export function ModalInsumo({ aberto, onFechar, inicial, onSalvo }) {
  const { api } = useStore()
  const toast = useToast()
  const [f, setF] = useState(insumoVazio)
  const [tentou, setTentou] = useState(false)
  useEffect(() => {
    if (aberto) {
      setF(inicial ? { ...insumoVazio(), ...inicial } : insumoVazio())
      setTentou(false)
    }
  }, [aberto, inicial])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const erros = {
    nome: !String(f.nome || '').trim() ? 'Dê um nome.' : null,
    precoEmbalagem: !(ok(f.precoEmbalagem) && f.precoEmbalagem >= 0) ? 'Informe o preço pago.' : null,
    qtdEmbalagem: !(ok(f.qtdEmbalagem) && f.qtdEmbalagem > 0) ? 'Informe quantas unidades vieram.' : null,
    estoque: erroEstoque(f.estoque),
  }
  const e = (k) => (tentou ? erros[k] : null)
  const unidade = UNIDADES_INSUMO.find((u) => u.valor === f.unidade)?.valor || f.unidade
  const salvar = () => {
    setTentou(true)
    if (Object.values(erros).some(Boolean)) return
    const doc = api.salvar('insumos', { ...f, id: f.id || novoId(), nome: f.nome.trim() })
    toast(inicial ? 'Insumo atualizado' : 'Insumo cadastrado')
    onSalvo?.(doc)
    onFechar()
  }
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={inicial ? 'Editar insumo' : 'Novo insumo'}
      subtitulo="Embalagens, ímãs, parafusos, álcool de lavagem e outros materiais extras."
      rodape={
        <>
          <Btn onClick={onFechar}>Cancelar</Btn>
          <Btn variante="primary" onClick={salvar}>
            Salvar insumo
          </Btn>
        </>
      }
    >
      {!inicial && (
        <div className="chip-row" aria-label="Sugestões">
          {SUGESTOES_INSUMO.map((s) => (
            <button key={s.nome} type="button" className="chip" onClick={() => setF((x) => ({ ...x, ...s }))}>
              {s.nome}
            </button>
          ))}
        </div>
      )}
      <div className="grid-2">
        <Texto rotulo="Nome" valor={f.nome} onMuda={(v) => set('nome', v)} erro={e('nome')} maxLength={80} />
        <Selecao rotulo="Unidade de uso" valor={f.unidade} onMuda={(v) => set('unidade', v)} opcoes={UNIDADES_INSUMO.map((u) => ({ valor: u.valor, rotulo: `${u.rotulo} (${u.valor})` }))} />
      </div>
      <div className="grid-3">
        <Numero rotulo="Preço pago" prefixo="R$" valor={f.precoEmbalagem} onMuda={(v) => set('precoEmbalagem', v)} erro={e('precoEmbalagem')} casas={2} dica="Pacote, rolo ou frasco inteiro." />
        <Numero rotulo="Quantidade no pacote" unidade={unidade} valor={f.qtdEmbalagem} onMuda={(v) => set('qtdEmbalagem', v)} erro={e('qtdEmbalagem')} casas={3} />
        <Numero rotulo="Em estoque" unidade={unidade} valor={f.estoque ?? null} onMuda={(v) => set('estoque', v)} erro={e('estoque')} casas={3} placeholder="—" dica="Opcional, na unidade de uso." />
      </div>
      <p className="small muted">
        Cada {unidade} sai a <strong className="num">{fmtBRL(precoUnidadeInsumo(f))}</strong>.
      </p>
    </Modal>
  )
}

// ---------- Página ----------

export default function MeuQG({ params }) {
  const { dados } = useStore()
  const [aba, setAba] = useState(params?.aba || 'impressoras')
  const [modal, setModal] = useState(null)
  const confirmar = useConfirmar()
  const { api } = useStore()
  const toast = useToast()
  const tarifa = n0(dados.config.custos.tarifaKwh)

  const impressoras = Object.values(dados.impressoras).sort((a, b) => a.nome.localeCompare(b.nome))
  const estacoes = Object.values(dados.washcures).sort((a, b) => a.nome.localeCompare(b.nome))
  const filamentos = Object.values(dados.filamentos).sort((a, b) => a.nome.localeCompare(b.nome))
  const resinas = Object.values(dados.resinas).sort((a, b) => a.nome.localeCompare(b.nome))
  const insumos = Object.values(dados.insumos).sort((a, b) => a.nome.localeCompare(b.nome))
  const [importar, setImportar] = useState(null)
  const [exportando, setExportando] = useState(false)
  const valorMateriais = filamentos.reduce((s, m) => s + valorEstoque('filamentos', m), 0) + resinas.reduce((s, m) => s + valorEstoque('resinas', m), 0)
  const valorInsumos = insumos.reduce((s, m) => s + valorEstoque('insumos', m), 0)

  const exportar = async () => {
    setExportando(true)
    try {
      const r = await baixarArquivo(nomeArquivoMateriais(), await xlsxMateriais(dados))
      if (r === 'salvo') toast('Planilha pronta')
    } catch (e) {
      toast(e.message || 'Não foi possível gerar a planilha.', 'bad')
    } finally {
      setExportando(false)
    }
  }

  const botoesPlanilha = (tipo) => (
    <>
      <Btn icone="subir" onClick={() => setImportar(tipo)}>
        Importar planilha
      </Btn>
      <Btn icone="baixar" disabled={exportando} onClick={exportar}>
        {exportando ? 'Gerando…' : 'Exportar'}
      </Btn>
    </>
  )

  const excluir = async (col, item, rotulo) => {
    const usos = usosDe(dados, col, item.id)
    const okk = await confirmar({
      titulo: `Excluir ${rotulo}?`,
      texto: usos
        ? `${item.nome} é usado em ${usos} cálculo(s). Esses cálculos vão mostrar um aviso até você escolher outro cadastro. Orçamentos e pedidos já registrados não mudam.`
        : `${item.nome} será removido do Meu QG.`,
      acao: 'Excluir',
      perigo: true,
    })
    if (!okk) return
    api.apagar(col, item.id)
    toast(`${rotulo.charAt(0).toUpperCase() + rotulo.slice(1)} excluído`)
  }

  const linhaAcoes = (col, item, rotulo, tipoModal) => (
    <div className="actions">
      <Btn tamanho="sm" icone="editar" onClick={() => setModal({ tipo: tipoModal, item })}>
        Editar
      </Btn>
      <Btn tamanho="sm" variante="ghost" icone="lixo" aria-label={`Excluir ${item.nome}`} onClick={() => excluir(col, item, rotulo)} />
    </div>
  )

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Centro de custos</span>
          <h1>Meu QG</h1>
          <p>Impressoras, materiais e insumos cadastrados uma vez. Todo cálculo puxa os custos daqui, e mudar um cadastro atualiza os cálculos que o usam.</p>
        </div>
      </div>

      <Abas
        valor={aba}
        onMuda={setAba}
        abas={[
          { valor: 'impressoras', rotulo: 'Impressoras', conta: impressoras.length + estacoes.length },
          { valor: 'materiais', rotulo: 'Filamentos e resinas', conta: filamentos.length + resinas.length },
          { valor: 'insumos', rotulo: 'Insumos', conta: insumos.length },
        ]}
      />

      {aba === 'impressoras' && (
        <div className="stack">
          <div className="row between">
            <p className="muted small">Energia: {fmtBRL(tarifa)}/kWh (altere em Meu negócio).</p>
            <div className="actions">
              <Btn icone="mais2" onClick={() => setModal({ tipo: 'estacao' })}>
                Estação de lavagem e cura
              </Btn>
              <Btn variante="primary" icone="mais2" onClick={() => setModal({ tipo: 'impressora' })}>
                Nova impressora
              </Btn>
            </div>
          </div>
          {!impressoras.length ? (
            <Vazio titulo="Nenhuma impressora cadastrada" texto="Cadastre sua impressora com o valor pago e o consumo médio. É a base do custo de máquina, energia e manutenção.">
              <Btn variante="primary" icone="mais2" onClick={() => setModal({ tipo: 'impressora' })}>
                Cadastrar impressora
              </Btn>
            </Vazio>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Impressora</th>
                    <th>Processo</th>
                    <th className="num">Valor</th>
                    <th className="num">Consumo</th>
                    <th className="num">Máquina/h</th>
                    <th className="num">Manut./h</th>
                    <th className="num">Falhas</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {impressoras.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <Icon nome="impressora" />
                          <div>
                            <div className="strong">{i.nome}</div>
                            <div className="tiny muted">
                              {NIVEIS_USO.find((n) => n.valor === i.nivelUso)?.rotulo} · {i.amortizacao?.modo === 'vidaUtil' ? `${fmtNum(i.amortizacao.horas, 0)} h de vida útil` : `se paga em ${i.amortizacao?.meses} meses`} · {fmtNum(i.horasPorDia)} h/dia
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Pill tipo={i.processo === 'resina' ? 'info' : 'accent'}>{i.processo === 'resina' ? 'Resina' : 'FDM'}</Pill>
                      </td>
                      <td className="num">{fmtBRL(n0(i.valor))}</td>
                      <td className="num">{fmtNum(n0(i.potenciaW), 0)} W</td>
                      <td className="num">{fmtBRL(custoHoraMaquina(i))}</td>
                      <td className="num">{fmtBRL(custoHoraManutencao(i, pctManutencao(i)))}</td>
                      <td className="num">{fmtPct(n0(i.falhasPct))}</td>
                      <td className="right">{linhaAcoes('impressoras', i, 'impressora', 'impressora')}</td>
                    </tr>
                  ))}
                  {estacoes.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <Icon nome="camadas" />
                          <div>
                            <div className="strong">{w.nome}</div>
                            <div className="tiny muted">Estação de lavagem e cura</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Pill>Pós-cura</Pill>
                      </td>
                      <td className="num">{fmtBRL(n0(w.valor))}</td>
                      <td className="num">{fmtNum(n0(w.potenciaW), 0)} W</td>
                      <td className="num">{fmtBRL(custoHoraMaquina(w))}</td>
                      <td className="num">{fmtBRL(custoHoraManutencao(w, MANUTENCAO_ANUAL_LAVAGEM_CURA))}</td>
                      <td className="num">—</td>
                      <td className="right">{linhaAcoes('washcures', w, 'estação', 'estacao')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {aba === 'materiais' && (
        <div className="stack">
          <div className="row between">
            <p className="muted small">
              Preço do carretel ou do frasco, como você paga hoje.
              {valorMateriais > 0 && (
                <>
                  {' '}
                  Em estoque: <strong className="num">{fmtBRL(valorMateriais)}</strong>.
                </>
              )}
            </p>
            <div className="actions">
              {botoesPlanilha('filamentos')}
              <Btn icone="mais2" onClick={() => setModal({ tipo: 'resina' })}>
                Nova resina
              </Btn>
              <Btn variante="primary" icone="mais2" onClick={() => setModal({ tipo: 'filamento' })}>
                Novo filamento
              </Btn>
            </div>
          </div>
          {!filamentos.length && !resinas.length ? (
            <Vazio titulo="Nenhum material cadastrado" texto="Cadastre cada filamento ou resina que você usa, com o preço que paga. O custo por grama ou por litro entra direto nos cálculos.">
              <Btn variante="primary" icone="mais2" onClick={() => setModal({ tipo: 'filamento' })}>
                Cadastrar filamento
              </Btn>
              <Btn icone="mais2" onClick={() => setModal({ tipo: 'resina' })}>
                Cadastrar resina
              </Btn>
              <Btn icone="subir" onClick={() => setImportar('filamentos')}>
                Importar de uma planilha
              </Btn>
            </Vazio>
          ) : (
            <div className="table-wrap">
              <table className="table tabela-materiais">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Tipo</th>
                    <th>Marca / fornecedor</th>
                    <th className="num">Embalagem</th>
                    <th className="num">Custo</th>
                    <th className="num">Estoque</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filamentos.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <span className="color-dot" style={{ background: m.cor }} />
                          <span className="strong">{m.nome}</span>
                        </div>
                      </td>
                      <td>{m.tipo}</td>
                      <td className="muted">{[m.marca, m.fornecedor].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="num">
                        {fmtBRL(n0(m.custoCarretel))} / {fmtNum(n0(m.pesoCarretelG), 0)} g
                      </td>
                      <td className="num">{fmtBRL(custoGramaFilamento(m) * 1000)}/kg</td>
                      <td className="num estoque">{fmtEstoque(m.estoque, 'carretel', 'carretéis')}</td>
                      <td className="right">{linhaAcoes('filamentos', m, 'filamento', 'filamento')}</td>
                    </tr>
                  ))}
                  {resinas.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="row" style={{ gap: 8 }}>
                          <span className="color-dot" style={{ background: m.cor }} />
                          <span className="strong">{m.nome}</span>
                        </div>
                      </td>
                      <td>Resina {m.tipo}</td>
                      <td className="muted">{[m.marca, m.fornecedor].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="num">
                        {fmtBRL(n0(m.custoFrasco))} / {fmtNum(n0(m.volumeFrascoMl), 0)} ml
                      </td>
                      <td className="num">{fmtBRL(custoLitroResina(m))}/L</td>
                      <td className="num estoque">{fmtEstoque(m.estoque, 'frasco', 'frascos')}</td>
                      <td className="right">{linhaAcoes('resinas', m, 'resina', 'resina')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {aba === 'insumos' && (
        <div className="stack">
          <div className="row between">
            <p className="muted small">
              Para itens divididos entre várias peças, use a fração de cada produto no cálculo.
              {valorInsumos > 0 && (
                <>
                  {' '}
                  Em estoque: <strong className="num">{fmtBRL(valorInsumos)}</strong>.
                </>
              )}
            </p>
            <div className="actions">
              {botoesPlanilha('insumos')}
              <Btn variante="primary" icone="mais2" onClick={() => setModal({ tipo: 'insumo' })}>
                Novo insumo
              </Btn>
            </div>
          </div>
          {!insumos.length ? (
            <Vazio titulo="Nenhum insumo cadastrado" texto="Caixas, plástico bolha, ímãs, insertos, argolas e álcool de lavagem também são custo. Cadastre e adicione aos produtos.">
              <Btn variante="primary" icone="mais2" onClick={() => setModal({ tipo: 'insumo' })}>
                Cadastrar insumo
              </Btn>
              <Btn icone="subir" onClick={() => setImportar('insumos')}>
                Importar de uma planilha
              </Btn>
            </Vazio>
          ) : (
            <div className="table-wrap">
              <table className="table tabela-materiais">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th className="num">Pacote</th>
                    <th className="num">Por unidade de uso</th>
                    <th className="num">Estoque</th>
                    <th className="num">Em cálculos</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {insumos.map((m) => (
                    <tr key={m.id}>
                      <td className="strong">{m.nome}</td>
                      <td className="num">
                        {fmtBRL(n0(m.precoEmbalagem))} / {fmtNum(n0(m.qtdEmbalagem), 3)} {m.unidade}
                      </td>
                      <td className="num">
                        {fmtBRL(precoUnidadeInsumo(m))}/{m.unidade}
                      </td>
                      <td className="num estoque">{fmtEstoque(m.estoque, m.unidade, m.unidade)}</td>
                      <td className="num">{usosDe(dados, 'insumos', m.id)}</td>
                      <td className="right">{linhaAcoes('insumos', m, 'insumo', 'insumo')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ModalImpressora aberto={modal?.tipo === 'impressora'} inicial={modal?.tipo === 'impressora' ? modal.item : null} onFechar={() => setModal(null)} />
      <ModalEstacao aberto={modal?.tipo === 'estacao'} inicial={modal?.tipo === 'estacao' ? modal.item : null} onFechar={() => setModal(null)} />
      <ModalFilamento aberto={modal?.tipo === 'filamento'} inicial={modal?.tipo === 'filamento' ? modal.item : null} onFechar={() => setModal(null)} />
      <ModalResina aberto={modal?.tipo === 'resina'} inicial={modal?.tipo === 'resina' ? modal.item : null} onFechar={() => setModal(null)} />
      <ModalInsumo aberto={modal?.tipo === 'insumo'} inicial={modal?.tipo === 'insumo' ? modal.item : null} onFechar={() => setModal(null)} />
      <ImportarMateriais aberto={!!importar} tipoPadrao={importar || 'filamentos'} onFechar={() => setImportar(null)} />
    </div>
  )
}
