import { useMemo, useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Field, Secao } from '../components/ui.jsx'
import ImportarMateriais, { baixarModeloMateriais } from '../components/ImportarMateriais.jsx'
import { baixarArquivo } from '../lib/files.js'
import { fmtBRL, fmtNum, fmtPct, hojeISO, plural } from '../lib/format.js'
import { analisarFinanceiro, intervaloDe, nomeArquivoFinanceiro, PERIODOS, rotuloIntervalo, xlsxFinanceiro } from '../lib/financeiro.js'
import { nomeArquivoMateriais, resumoEstoque, xlsxMateriais } from '../lib/materiais.js'
import { xlsxCalculos, xlsxClientesPedidos } from '../lib/planilha.js'
import { precificar, validarProduto } from '../lib/pricing.js'

function Kpi({ rotulo, valor, nota }) {
  return (
    <div className="stat-card stat">
      <span className="label">{rotulo}</span>
      <span className="v">{valor}</span>
      {nota && <span className="tiny muted">{nota}</span>}
    </div>
  )
}

export default function Planilhas({ params }) {
  const { dados, ctx } = useStore()
  const toast = useToast()
  const hoje = hojeISO()
  const [periodo, setPeriodo] = useState('mes')
  const [de, setDe] = useState(`${hoje.slice(0, 8)}01`)
  const [ate, setAte] = useState(hoje)
  const [ocupado, setOcupado] = useState('')
  const [importar, setImportar] = useState(!!params?.importar)

  const intervalo = useMemo(() => intervaloDe(periodo, de, ate), [periodo, de, ate])
  const fin = useMemo(() => analisarFinanceiro(dados, ctx, intervalo), [dados, ctx, intervalo])
  const est = useMemo(() => resumoEstoque(dados), [dados])
  const t = fin.totais
  const produtos = Object.values(dados.produtos)

  const baixar = async (chave, gerar, nome) => {
    setOcupado(chave)
    try {
      const blob = await gerar()
      const r = await baixarArquivo(nome, blob)
      if (r === 'salvo') toast('Planilha pronta')
    } catch (e) {
      toast(e.message || 'Não foi possível gerar a planilha.', 'bad')
    } finally {
      setOcupado('')
    }
  }

  const listaCalculos = () =>
    produtos
      .filter((p) => !validarProduto(p))
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
      .map((produto) => ({ produto, res: precificar(produto, ctx) }))

  const estoqueNota = [est.carreteis ? `${fmtNum(est.carreteis)} ${est.carreteis === 1 ? 'carretel' : 'carretéis'}` : '', est.frascos ? `${fmtNum(est.frascos)} ${est.frascos === 1 ? 'frasco' : 'frascos'}` : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Excel</span>
          <h1>Planilhas</h1>
          <p>Baixe os dados em Excel (.xlsx) com moeda, datas e números de verdade: dá para somar, filtrar e fazer tabela dinâmica. E cadastre materiais de uma vez a partir de uma planilha.</p>
        </div>
      </div>

      <Secao titulo="Financeiro" descricao="Vendas, recebimentos, o que falta receber e lucro estimado do período.">
        <div className="chip-row" role="group" aria-label="Período">
          {PERIODOS.map((p) => (
            <button key={p.valor} type="button" className="chip" aria-pressed={periodo === p.valor} onClick={() => setPeriodo(p.valor)}>
              {p.rotulo}
            </button>
          ))}
        </div>
        {periodo === 'datas' && (
          <div className="periodo-datas">
            <Field rotulo="De" htmlFor="fin-de">
              <input id="fin-de" type="date" className="input" value={de} onChange={(e) => setDe(e.target.value)} />
            </Field>
            <Field rotulo="Até" htmlFor="fin-ate">
              <input id="fin-ate" type="date" className="input" value={ate} onChange={(e) => setAte(e.target.value)} />
            </Field>
          </div>
        )}
        <p className="small muted">Período: {rotuloIntervalo(intervalo)}</p>
        <div className="stats">
          <Kpi rotulo="Vendido" valor={fmtBRL(t.vendido)} nota={plural(t.pedidos, 'pedido', 'pedidos')} />
          <Kpi rotulo="Recebido" valor={fmtBRL(t.liquido)} nota={t.devolvido > 0 ? `já sem as devoluções (${fmtBRL(t.devolvido)})` : 'entradas no período'} />
          <Kpi rotulo="A receber hoje" valor={fmtBRL(t.aReceberHoje)} nota={plural(fin.aReceber.length, 'pedido em aberto', 'pedidos em aberto')} />
          <Kpi rotulo="Lucro estimado" valor={fmtBRL(t.lucro)} nota={t.margem === null ? 'sem custo calculado' : `margem ${fmtPct(t.margem)}`} />
        </div>
        <div className="actions">
          <Btn variante="primary" icone="baixar" disabled={!!ocupado} onClick={() => baixar('fin', () => xlsxFinanceiro(dados, ctx, intervalo), nomeArquivoFinanceiro(intervalo))}>
            {ocupado === 'fin' ? 'Gerando…' : 'Baixar planilha financeira (.xlsx)'}
          </Btn>
        </div>
        <p className="tiny muted">
          Abas: Resumo com totais por mês, Movimentações (entradas e devoluções pela data do pagamento), Pedidos, Itens vendidos, A receber, Cancelados, Orçamentos e Custos fixos. Vendas contam pela data do pedido.
        </p>
      </Secao>

      <Secao titulo="Materiais e estoque" descricao="Filamentos, resinas e insumos com preço, estoque e o valor parado em estoque.">
        <div className="stats">
          <Kpi rotulo="Materiais cadastrados" valor={est.itens} nota={`${Object.keys(dados.filamentos).length} filamentos · ${Object.keys(dados.resinas).length} resinas · ${Object.keys(dados.insumos).length} insumos`} />
          <Kpi rotulo="Valor em estoque" valor={fmtBRL(est.valor)} nota={estoqueNota || 'informe o estoque em cada material'} />
        </div>
        <div className="actions">
          <Btn variante="primary" icone="subir" onClick={() => setImportar(true)}>
            Importar planilha
          </Btn>
          <Btn icone="baixar" disabled={!!ocupado} onClick={() => baixar('mat', () => xlsxMateriais(dados), nomeArquivoMateriais())}>
            {ocupado === 'mat' ? 'Gerando…' : 'Exportar materiais e estoque'}
          </Btn>
          <Btn
            icone="baixar"
            disabled={!!ocupado}
            onClick={async () => {
              setOcupado('modelo')
              await baixarModeloMateriais(toast)
              setOcupado('')
            }}
          >
            {ocupado === 'modelo' ? 'Gerando…' : 'Baixar tabela modelo'}
          </Btn>
        </div>
        <ol className="passos small">
          <li>Baixe a tabela modelo (ou exporte o que já tem cadastrado).</li>
          <li>Preencha no Excel uma linha por material, ou cole da sua planilha mantendo os títulos.</li>
          <li>Clique em “Importar planilha” e confira antes de salvar.</li>
        </ol>
        <p className="tiny muted">Para só atualizar o estoque: exporte, mude a coluna “Em estoque” e importe de volta. O app reconhece cada material pelo nome ou pelo código.</p>
      </Secao>

      <Secao titulo="Outras planilhas">
        <div className="planilha-item">
          <div>
            <div className="strong">Catálogo e cálculos</div>
            <div className="small muted">Custo, preço, lucro, margem e preço por canal de cada produto ({plural(produtos.length, 'produto', 'produtos')}).</div>
          </div>
          <Btn icone="baixar" aria-label="Baixar catálogo e cálculos" disabled={!!ocupado || !produtos.length} onClick={() => baixar('calc', () => xlsxCalculos(listaCalculos()), `catalogo-e-calculos-${hoje}.xlsx`)}>
            {ocupado === 'calc' ? 'Gerando…' : 'Baixar .xlsx'}
          </Btn>
        </div>
        <div className="planilha-item">
          <div>
            <div className="strong">Clientes, pedidos e orçamentos</div>
            <div className="small muted">Clientes com total comprado, pedidos, recebimentos e orçamentos de todo o período.</div>
          </div>
          <Btn icone="baixar" aria-label="Baixar clientes, pedidos e orçamentos" disabled={!!ocupado} onClick={() => baixar('cli', () => xlsxClientesPedidos(dados), `clientes-e-pedidos-${hoje}.xlsx`)}>
            {ocupado === 'cli' ? 'Gerando…' : 'Baixar .xlsx'}
          </Btn>
        </div>
      </Secao>

      <ImportarMateriais aberto={importar} onFechar={() => setImportar(false)} />
    </div>
  )
}
