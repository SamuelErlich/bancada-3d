import { useEffect, useMemo, useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Aviso, Btn, Field, Modal, Pill, Selecao, Seg, SeletorArquivo } from './ui.jsx'
import Icon from './Icon.jsx'
import { lerPlanilha } from '../lib/excel.js'
import { baixarArquivo } from '../lib/files.js'
import { fmtBRL, fmtNum, plural } from '../lib/format.js'
import { analisarMateriais, documentosParaSalvar, INFO_MATERIAL, NOME_MODELO, rotuloCampo, xlsxModeloMateriais } from '../lib/materiais.js'

const STATUS = {
  novo: ['ok', 'Novo'],
  atualizar: ['info', 'Atualiza'],
  igual: ['', 'Sem mudança'],
  exemplo: ['', 'Exemplo (ignorado)'],
  repetido: ['warn', 'Repetido'],
  erro: ['bad', 'Erro'],
}

const MOEDA = new Set(['custoCarretel', 'custoFrasco', 'precoEmbalagem'])
const MAX_LINHAS = 150

const num = (v) => (Number.isFinite(v) ? (Number.isInteger(v) ? fmtNum(v, 0) : fmtNum(v, 2)) : '—')

function fmtCampo(campo, v) {
  if (v === null || v === undefined || v === '') return '—'
  if (MOEDA.has(campo)) return fmtBRL(v)
  if (campo === 'pesoCarretelG') return `${num(v)} g`
  if (campo === 'volumeFrascoMl') return `${num(v)} ml`
  if (typeof v === 'number') return num(v)
  return String(v)
}

const COLUNAS_PREVIA = {
  filamentos: [
    ['tipo', 'Tipo'],
    ['custoCarretel', 'Preço'],
    ['pesoCarretelG', 'Peso'],
    ['estoque', 'Estoque'],
  ],
  resinas: [
    ['tipo', 'Tipo'],
    ['custoFrasco', 'Preço'],
    ['volumeFrascoMl', 'Volume'],
    ['estoque', 'Estoque'],
  ],
  insumos: [
    ['unidade', 'Unidade'],
    ['precoEmbalagem', 'Preço'],
    ['qtdEmbalagem', 'Qtd. no pacote'],
    ['estoque', 'Estoque'],
  ],
}

function detalhe(l) {
  if (l.erro) return l.erro
  const partes = []
  if (l.status === 'atualizar' && l.alvo) {
    for (const k of l.mudancas) partes.push(`${rotuloCampo(k)}: ${fmtCampo(k, l.alvo[k])} → ${fmtCampo(k, l.doc?.[k])}`)
  }
  if (l.status === 'exemplo') partes.push('Linha de exemplo da tabela modelo')
  return [...partes, ...(l.avisos || [])].join(' · ')
}

export async function baixarModeloMateriais(toast) {
  try {
    const blob = await xlsxModeloMateriais()
    const r = await baixarArquivo(NOME_MODELO, blob)
    if (r === 'salvo') toast('Tabela modelo pronta')
  } catch (e) {
    toast(e.message || 'Não foi possível gerar a tabela modelo.', 'bad')
  }
}

export default function ImportarMateriais({ aberto, onFechar, tipoPadrao = 'filamentos' }) {
  const { dados, api } = useStore()
  const toast = useToast()
  const [abas, setAbas] = useState(null)
  const [arquivo, setArquivo] = useState('')
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState('')
  const [tipos, setTipos] = useState({})
  const [quando, setQuando] = useState('atualizar')
  const [salvando, setSalvando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [modelo, setModelo] = useState(false)

  useEffect(() => {
    if (aberto) {
      setAbas(null)
      setArquivo('')
      setErro('')
      setTipos({})
      setQuando('atualizar')
      setResultado(null)
    }
  }, [aberto])

  const analise = useMemo(
    () => (abas && !resultado ? analisarMateriais(abas, dados, { tipos, quandoNomeExiste: quando, tipoPadrao }) : null),
    [abas, dados, tipos, quando, tipoPadrao, resultado],
  )
  const aSalvar = analise ? analise.totais.novo + analise.totais.atualizar : 0

  const ler = async (file) => {
    setErro('')
    setLendo(true)
    try {
      const lidas = await lerPlanilha(file)
      if (!lidas.some((a) => a.linhas.length)) throw new Error('A planilha está vazia.')
      setAbas(lidas)
      setArquivo(file.name || 'planilha')
      setTipos({})
    } catch (e) {
      setErro(e.message || 'Não consegui ler a planilha.')
    } finally {
      setLendo(false)
    }
  }

  const importar = async () => {
    if (!analise || !aSalvar) return
    const docs = documentosParaSalvar(analise)
    setSalvando(true)
    try {
      for (const tipo of Object.keys(docs)) if (docs[tipo].length) await api.salvarVarios(tipo, docs[tipo])
      const t = analise.totais
      setResultado({ ...t })
      toast(`${plural(t.novo, 'material cadastrado', 'materiais cadastrados')}, ${plural(t.atualizar, 'atualizado', 'atualizados')}`)
    } finally {
      setSalvando(false)
    }
  }

  const modeloBtn = (
    <Btn
      icone="baixar"
      disabled={modelo}
      onClick={async () => {
        setModelo(true)
        await baixarModeloMateriais(toast)
        setModelo(false)
      }}
    >
      {modelo ? 'Gerando…' : 'Baixar tabela modelo'}
    </Btn>
  )

  let corpo
  if (resultado) {
    corpo = (
      <div className="stack">
        <Aviso tipo="ok" icone="check">
          Importação concluída: {plural(resultado.novo, 'cadastrado', 'cadastrados')}, {plural(resultado.atualizar, 'atualizado', 'atualizados')}
          {resultado.igual ? `, ${plural(resultado.igual, 'sem mudança', 'sem mudança')}` : ''}
          {resultado.ignoradas ? `, ${plural(resultado.ignoradas, 'linha ignorada', 'linhas ignoradas')}` : ''}.
        </Aviso>
        <p className="small muted">Os materiais já aparecem em Meu QG e nos cálculos. Cálculos que usam um material atualizado passam a usar o preço novo.</p>
      </div>
    )
  } else if (!analise) {
    corpo = (
      <div className="stack">
        <SeletorArquivo aceitar=".xlsx,.xls,.xlsm,.ods,.csv" maxMB={20} msgFormato="Use uma planilha .xlsx, .xls, .ods ou .csv." onArquivo={ler}>
          <Icon nome="subir" />
          <span className="strong small">{lendo ? 'Lendo a planilha…' : 'Escolher planilha'}</span>
          <span className="tiny muted">Excel (.xlsx ou .xls), LibreOffice (.ods) ou .csv. Também dá para arrastar o arquivo aqui.</span>
        </SeletorArquivo>
        {erro && <Aviso tipo="bad">{erro}</Aviso>}
        <ol className="passos small">
          <li>Baixe a tabela modelo (ou exporte os materiais que já tem).</li>
          <li>Preencha no Excel uma linha por material. Pode colar da sua planilha, mantendo os títulos das colunas.</li>
          <li>Escolha o arquivo aqui. O app mostra o que é novo, o que atualiza e o que tem erro antes de salvar.</li>
        </ol>
        <div className="actions">{modeloBtn}</div>
        <p className="tiny muted">Só quer atualizar o estoque? Exporte os materiais, mude a coluna “Em estoque” e importe de volta.</p>
      </div>
    )
  } else {
    const t = analise.totais
    corpo = (
      <div className="stack">
        <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className="small">
            <Icon nome="arquivo" tamanho={15} /> <strong>{arquivo}</strong>
          </span>
          <Btn tamanho="sm" variante="ghost" onClick={() => setAbas(null)}>
            Escolher outro arquivo
          </Btn>
        </div>
        <div className="chip-row">
          <Pill tipo="ok">{plural(t.novo, 'novo', 'novos')}</Pill>
          <Pill tipo="info">{plural(t.atualizar, 'atualização', 'atualizações')}</Pill>
          {t.igual > 0 && <Pill>{plural(t.igual, 'sem mudança', 'sem mudança')}</Pill>}
          {t.ignoradas > 0 && <Pill tipo="warn">{plural(t.ignoradas, 'linha ignorada', 'linhas ignoradas')}</Pill>}
        </div>
        <Field rotulo="Quando o nome já existe no app">
          <Seg
            rotulo="Quando o nome já existe no app"
            valor={quando}
            onMuda={setQuando}
            opcoes={[
              { valor: 'atualizar', rotulo: 'Atualizar o cadastro' },
              { valor: 'novo', rotulo: 'Cadastrar outro' },
            ]}
          />
        </Field>

        {analise.abas.map((aba) => (
          <section key={aba.idx} className="stack-sm import-aba">
            <div className="row between" style={{ flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
              <div>
                <span className="label">Aba</span>
                <div className="strong">{aba.nome}</div>
              </div>
              <Selecao
                rotulo="Importar como"
                valor={aba.tipo || ''}
                onMuda={(v) => setTipos((x) => ({ ...x, [aba.idx]: v || null }))}
                opcoes={[
                  { valor: 'filamentos', rotulo: 'Filamentos' },
                  { valor: 'resinas', rotulo: 'Resinas' },
                  { valor: 'insumos', rotulo: 'Insumos' },
                  { valor: '', rotulo: 'Não importar' },
                ]}
              />
            </div>
            {aba.incerto && aba.tipo && <Aviso tipo="warn">Não deu para saber o tipo desta aba pelo nome. Confira em “Importar como”.</Aviso>}
            {!aba.tipo ? (
              <p className="tiny muted">{aba.motivo || 'Não importar'}.</p>
            ) : (
              <>
                <p className="tiny muted">
                  Colunas usadas: {aba.colunas.filter((c) => c.campo).map((c) => c.titulo).join(', ') || 'nenhuma'}
                  {aba.colunas.some((c) => !c.campo) ? ` · Não usadas: ${aba.colunas.filter((c) => !c.campo).map((c) => c.titulo).join(', ')}` : ''}
                </p>
                {!aba.linhas.length ? (
                  <p className="tiny muted">Nenhuma linha preenchida.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="table table-compact">
                      <thead>
                        <tr>
                          <th className="num">Linha</th>
                          <th>Situação</th>
                          <th>Nome</th>
                          {COLUNAS_PREVIA[aba.tipo].map(([c, r]) => (
                            <th key={c} className={c === 'tipo' || c === 'unidade' ? '' : 'num'}>
                              {r}
                            </th>
                          ))}
                          <th>Detalhe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aba.linhas.slice(0, MAX_LINHAS).map((l) => {
                          const [tipoPill, rotulo] = STATUS[l.status] || ['', l.status]
                          const fonte = l.doc || l.campos
                          return (
                            <tr key={l.n} className={l.status === 'erro' || l.status === 'repetido' ? 'linha-erro' : l.status === 'exemplo' || l.status === 'igual' ? 'linha-apagada' : ''}>
                              <td className="num muted">{l.n}</td>
                              <td>
                                <Pill tipo={tipoPill}>{rotulo}</Pill>
                              </td>
                              <td className="strong">{l.nome || '—'}</td>
                              {COLUNAS_PREVIA[aba.tipo].map(([c]) => (
                                <td key={c} className={c === 'tipo' || c === 'unidade' ? '' : 'num'}>
                                  {fmtCampo(c, fonte?.[c])}
                                </td>
                              ))}
                              <td className="small muted">{detalhe(l)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {aba.linhas.length > MAX_LINHAS && <p className="tiny muted">e mais {aba.linhas.length - MAX_LINHAS} linhas (todas entram na importação).</p>}
              </>
            )}
          </section>
        ))}
      </div>
    )
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      largo
      titulo="Importar materiais de uma planilha"
      subtitulo={resultado ? null : `Filamentos, resinas e insumos com preço e estoque. Na dúvida, o app usa ${INFO_MATERIAL[tipoPadrao]?.rotulo.toLowerCase() || 'filamentos'}.`}
      rodape={
        resultado || !analise ? (
          <Btn variante={resultado ? 'primary' : undefined} onClick={onFechar}>
            Fechar
          </Btn>
        ) : (
          <>
            <Btn onClick={onFechar}>Cancelar</Btn>
            <Btn variante="primary" icone="subir" disabled={!aSalvar || salvando} onClick={importar}>
              {salvando ? 'Salvando…' : aSalvar ? `Importar ${plural(aSalvar, 'material', 'materiais')}` : 'Nada para importar'}
            </Btn>
          </>
        )
      }
    >
      {corpo}
    </Modal>
  )
}
