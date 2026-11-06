import { useMemo, useState } from 'react'
import { fmtBRL, fmtMarkup, fmtPct, n0 } from '../lib/format.js'
import { avisoFaixaSugestao, simularDesconto, taxasDoCanal, temFaixas } from '../lib/pricing.js'
import { NumInput, Selecao, Numero, Percentual } from './ui.jsx'
import Icon from './Icon.jsx'

const CORES = {
  material: 'var(--c-material)',
  perdas: 'var(--c-perdas)',
  energia: 'var(--c-energia)',
  maquina: 'var(--c-maquina)',
  manutencao: 'var(--c-manutencao)',
  lcd: 'var(--c-lcd)',
  fep: 'var(--c-fep)',
  acabamento: 'var(--c-acabamento)',
  falhas: 'var(--c-falhas)',
  insumos: 'var(--c-insumos)',
  trabalho: 'var(--c-trabalho)',
  fixos: 'var(--c-fixos)',
}

export function Composicao({ res, compacto }) {
  const itens = res.composicao.filter((c) => c.valor > 0.000001)
  const total = res.total
  const semMaterial = itens.filter((c) => c.chave !== 'material').reduce((s, c) => s + c.valor, 0)
  return (
    <div className="stack-sm">
      <div className="costbar" role="img" aria-label="Composição do custo por unidade">
        {itens.map((c) => (
          <span key={c.chave} title={`${c.rotulo}: ${fmtBRL(c.valor)}`} style={{ width: `${total > 0 ? (c.valor / total) * 100 : 0}%`, background: CORES[c.chave] }} />
        ))}
      </div>
      <div className="costlist">
        {itens.map((c) => (
          <div className="ci" key={c.chave}>
            <span className="swatch" style={{ background: CORES[c.chave] }} />
            <span>{c.rotulo}</span>
            <span className="num">{fmtBRL(c.valor)}</span>
            <span className="num muted right tiny">{fmtPct(total > 0 ? c.valor / total : 0, 0)}</span>
          </div>
        ))}
        {!itens.length && <p className="muted small">Preencha peso e tempo para ver a composição.</p>}
      </div>
      {!compacto && semMaterial > 0 && itens.some((c) => c.chave === 'material') && (
        <p className="small muted">
          Além do material, cada unidade carrega <strong className="num">{fmtBRL(semMaterial)}</strong> em custos que costumam ficar de fora da conta.
        </p>
      )}
    </div>
  )
}

export function Canais({ res, imposto }) {
  if (!res.canais.length) return <p className="muted small">Nenhum canal de venda ativo. Ative canais em Meu negócio.</p>
  return (
    <div>
      {res.canais.map((c) => {
        const tx = Number.isFinite(c.preco) ? taxasDoCanal(c.canal, c.preco) : null
        const aviso = Number.isFinite(c.preco) ? avisoFaixaSugestao(c.canal, c.preco, imposto) : null
        return (
          <div className="channel" key={c.canal.id || c.canal.nome}>
            <div className="stack-sm" style={{ gap: 2 }}>
              <span className="strong">{c.canal.nome}</span>
              <span className="tiny muted">
                {tx ? `${fmtPct(tx.taxaPct, 2)} + ${fmtBRL(tx.adicional)} por unidade${temFaixas(c.canal) ? ' nesta faixa' : ''}` : 'Revise as taxas e o imposto.'}
              </span>
            </div>
            <div className="stack-sm" style={{ gap: 2, alignItems: 'flex-end' }}>
              <span className="price">{fmtBRL(c.preco)}</span>
              {Number.isFinite(c.preco) && <span className="tiny muted num">lucro {fmtBRL(c.lucro)}</span>}
            </div>
            {aviso && (
              <p className="note">
                A taxa sobe a partir de {fmtBRL(aviso.inicioFaixa)}; a sugestão já considera isso para manter seu lucro. Vendendo a {fmtBRL(aviso.precoAlternativo)}, sobram{' '}
                {fmtBRL(aviso.liquidoAlternativo)} por unidade depois de taxas e imposto.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SimuladorDesconto({ res, imposto }) {
  const validos = res.canais.filter((c) => Number.isFinite(c.preco))
  const [canalId, setCanalId] = useState(() => validos[validos.length - 1]?.canal.id || '')
  const [qtd, setQtd] = useState(10)
  const [desc, setDesc] = useState(0.1)
  const canal = validos.find((c) => c.canal.id === canalId) || validos[0]
  const sim = useMemo(() => (canal ? simularDesconto(canal, Math.max(0, Math.floor(n0(qtd))), n0(desc), imposto) : null), [canal, qtd, desc, imposto])
  if (!validos.length) return null
  return (
    <details className="more">
      <summary>Simular desconto por quantidade</summary>
      <div className="more-body">
        <Selecao rotulo="Canal" valor={canal?.canal.id} onMuda={setCanalId} opcoes={validos.map((c) => ({ valor: c.canal.id, rotulo: c.canal.nome }))} />
        <div className="grid-2">
          <Numero rotulo="Quantidade" unidade="un." valor={qtd} onMuda={setQtd} casas={0} />
          <Percentual rotulo="Desconto" valor={desc} onMuda={setDesc} />
        </div>
        {sim && Number.isFinite(sim.precoUnitario) ? (
          <div className="well stack-sm">
            <div className="kv"><span>Preço por unidade</span><span>{fmtBRL(sim.precoUnitario)}</span></div>
            <div className="kv"><span>Receita</span><span>{fmtBRL(sim.receita)}</span></div>
            <div className="kv"><span>Lucro do lote</span><span className={sim.lucro < 0 ? 'bad-text' : ''}>{fmtBRL(sim.lucro)}</span></div>
            <div className="kv"><span>Margem</span><span>{fmtPct(sim.margem)}</span></div>
            <p className="small muted">
              Em relação ao preço cheio, o lote rende {fmtBRL(Math.abs(sim.difLucro))} {sim.difLucro < 0 ? 'a menos' : 'a mais'} de lucro.
              {sim.lucro < 0 && ' Com esse desconto você paga para vender.'}
            </p>
          </div>
        ) : (
          <p className="small muted">Revise quantidade e desconto.</p>
        )}
      </div>
    </details>
  )
}

/**
 * Painel com o preço, o lucro, a composição do custo e o preço por canal.
 * Quando editável, mostra o controle de markup e o campo de preço manual.
 */
export default function PainelPreco({ res, imposto, editavel, markup, onMarkup, precoManual, onPrecoManual, extra }) {
  const manual = res.precoManual !== null
  return (
    <div className="price-panel">
      <div className="price-hero">
        <span className="label">{manual ? 'Seu preço · venda direta' : 'Preço sugerido · venda direta'}</span>
        <div className="v">{fmtBRL(res.preco)}</div>
        <div className="sub">
          <div className="stat">
            <span className="label">Custo/un.</span>
            <span className="v num">{fmtBRL(res.total)}</span>
          </div>
          <div className="stat">
            <span className="label">Lucro</span>
            <span className="v num">{fmtBRL(res.lucro)}</span>
          </div>
          <div className="stat">
            <span className="label">Margem</span>
            <span className="v num">{fmtPct(res.margem)}</span>
          </div>
        </div>
      </div>

      {res.lucro < 0 && (
        <div className="notice bad">
          <Icon nome="alerta" tamanho={17} />
          <div>Nesse preço você tem prejuízo de {fmtBRL(Math.abs(res.lucro))} por unidade.</div>
        </div>
      )}

      {editavel && (
        <div className="card stack-sm">
          <div className="row between">
            <span className="strong">Markup</span>
            <span className="num strong">{fmtMarkup(n0(markup))}</span>
          </div>
          <input
            className="range"
            type="range"
            min="1"
            max="5"
            step="0.05"
            value={Math.min(5, Math.max(1, n0(markup) || 1))}
            onChange={(e) => onMarkup(Number(e.target.value))}
            aria-label="Markup"
          />
          <div className="range-scale">
            <span>1×</span>
            <span>2×</span>
            <span>3×</span>
            <span>4×</span>
            <span>5×</span>
          </div>
          <div className="grid-2">
            <div className="field">
              <span className="field-label">Markup</span>
              <NumInput valor={markup} onMuda={onMarkup} unidade="×" casas={2} aria-label="Markup" />
            </div>
            <div className="field">
              <span className="field-label">Preço de venda</span>
              <NumInput valor={precoManual} onMuda={onPrecoManual} prefixo="R$" casas={2} placeholder={res.precoSugerido.toFixed(2).replace('.', ',')} aria-label="Preço de venda" />
            </div>
          </div>
          <p className="tiny muted">
            O markup multiplica o custo ({fmtMarkup(n0(markup))} = {fmtBRL(res.precoSugerido)}). Deixe o preço vazio para usar o sugerido.
            {manual && ' Com preço próprio, o valor não muda quando os custos mudarem.'}
          </p>
        </div>
      )}

      <div className="card stack-sm">
        <div className="row between">
          <h4>De onde vem o custo</h4>
          <span className="num small muted">{fmtBRL(res.total)}/un.</span>
        </div>
        <Composicao res={res} />
      </div>

      <div className="card stack-sm">
        <div className="row between">
          <h4>Preço por canal de venda</h4>
          <span className="tiny muted">mantém o lucro da venda direta</span>
        </div>
        <Canais res={res} imposto={imposto} />
        <div className="kv" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
          <span>Atacado (markup {fmtMarkup(res.markupAtacado)})</span>
          <span>{fmtBRL(res.precoAtacado)}</span>
        </div>
        <SimuladorDesconto res={res} imposto={imposto} />
      </div>
      {extra}
    </div>
  )
}
