import { useEffect, useMemo, useState } from 'react'
import { useStore, useToast, useImagem } from '../store.jsx'
import { Btn, Busca, Check, Field, Modal, Seg, SeletorArquivo, Texto, Aviso, Pill, Selecao, Imagem, Miniatura, useConfirmar } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { CENAS_IA } from '../lib/defaults.js'
import { PROVEDORES, gerarImagem, gravarChave, lerChave } from '../lib/ia.js'
import { baixarArquivo, comprimirImagem, dataUrlParaBlob, lerArquivoComoDataURL } from '../lib/files.js'
import { dentroDoClaude } from '../lib/storage.js'
import { contem, fmtDataHora, nomeArquivo } from '../lib/format.js'

function ModalAssociar({ aberto, onFechar, imagemId, produtoInicial }) {
  const { dados, api } = useStore()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [alvo, setAlvo] = useState(produtoInicial || null)
  const [ciente, setCiente] = useState(false)
  useEffect(() => {
    if (aberto) {
      setAlvo(produtoInicial || null)
      setCiente(false)
      setBusca('')
    }
  }, [aberto, produtoInicial])
  const produtos = Object.values(dados.produtos)
    .filter((p) => p.noCatalogo && (contem(p.nome, busca) || contem(p.sku, busca)))
    .sort((a, b) => a.nome.localeCompare(b.nome))
  const p = alvo ? dados.produtos[alvo] : null
  const usar = () => {
    if (!p) return
    const anterior = p.fotoId
    api.salvar('produtos', { ...p, fotoId: imagemId })
    if (anterior && anterior !== imagemId && dados.midias[anterior]?.origem !== 'ia') api.apagarImagem(anterior)
    toast(`Imagem usada em ${p.nome}`)
    onFechar()
  }
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Associar a um produto do catálogo"
      subtitulo="A imagem vira a foto do produto no catálogo e nos próximos orçamentos. Custo e preço não mudam."
      rodape={
        <>
          <Btn onClick={onFechar}>Cancelar</Btn>
          <Btn variante="primary" disabled={!p || (p.fotoId && !ciente)} onClick={usar}>
            Usar esta imagem
          </Btn>
        </>
      }
    >
      <Busca valor={busca} onMuda={setBusca} placeholder="Buscar produto" />
      <div className="list" style={{ maxHeight: 260, overflowY: 'auto' }}>
        {produtos.map((x) => (
          <button type="button" key={x.id} className={'list-item' + (alvo === x.id ? ' selected' : '')} onClick={() => setAlvo(x.id)}>
            <Miniatura id={x.fotoId} nome={x.nome} tamanho={36} />
            <div className="grow">
              <div className="strong small">{x.nome}</div>
              <div className="tiny muted">{x.fotoId ? 'Já tem foto' : 'Sem foto'}</div>
            </div>
          </button>
        ))}
        {!produtos.length && <p className="small muted">Nenhum produto no catálogo.</p>}
      </div>
      {p?.fotoId && (
        <Check marcado={ciente} onMuda={setCiente}>
          Entendo que a foto atual de “{p.nome}” será substituída.
        </Check>
      )}
    </Modal>
  )
}

function TileImagem({ m, onAssociar, onExcluir }) {
  const url = useImagem(m.id)
  const toast = useToast()
  return (
    <div className="img-tile">
      <div className="ph layers-bg">{url && <img src={url} alt={m.descricao || 'Imagem gerada'} />}</div>
      <div style={{ padding: 10 }} className="stack-sm">
        <span className="small strong" style={{ overflowWrap: 'anywhere' }}>
          {m.descricao || 'Produto'}
        </span>
        <span className="tiny muted">
          {m.cenaRotulo || 'Cena personalizada'} · {fmtDataHora(m.criadoEm)}
        </span>
        <div className="actions">
          <Btn
            tamanho="sm"
            icone="baixar"
            aria-label="Baixar"
            disabled={!url}
            onClick={async () => {
              const r = await baixarArquivo(`imagem-${nomeArquivo(m.descricao || 'produto')}.jpg`, dataUrlParaBlob(url)).catch((e) => toast(e.message, 'bad'))
              if (r === 'salvo') toast('Imagem pronta')
            }}
          />
          <Btn tamanho="sm" icone="link" onClick={() => onAssociar(m.id)}>
            Associar
          </Btn>
          <Btn tamanho="sm" variante="ghost" icone="lixo" aria-label="Excluir" onClick={() => onExcluir(m)} />
        </div>
      </div>
    </div>
  )
}

export default function ImagensIA({ params }) {
  const { dados, api } = useStore()
  const toast = useToast()
  const confirmar = useConfirmar()
  const noClaude = dentroDoClaude()
  const cfgIa = dados.config.ia || {}
  const [provedor, setProvedor] = useState(cfgIa.provedor || 'gemini')
  const [chave, setChave] = useState(() => lerChave(cfgIa.provedor || 'gemini'))
  const [modelo, setModelo] = useState(cfgIa.provedor === 'openai' ? cfgIa.modeloOpenai : cfgIa.modeloGemini)
  const [foto, setFoto] = useState(null)
  const [fotoProdutoId, setFotoProdutoId] = useState(params?.produtoId || '')
  const [descricao, setDescricao] = useState(() => (params?.produtoId ? dados.produtos[params.produtoId]?.nome || '' : ''))
  const [cenaId, setCenaId] = useState(CENAS_IA[0].id)
  const [cenaLivre, setCenaLivre] = useState('')
  const [revisando, setRevisando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [associar, setAssociar] = useState(null)
  const fotoDoProduto = useImagem(fotoProdutoId ? dados.produtos[fotoProdutoId]?.fotoId : null)
  const fotoBase = foto || fotoDoProduto

  useEffect(() => {
    setChave(lerChave(provedor))
    setModelo(provedor === 'openai' ? cfgIa.modeloOpenai || 'gpt-image-1' : cfgIa.modeloGemini || 'gemini-2.5-flash-image')
  }, [provedor]) // eslint-disable-line

  const prov = PROVEDORES.find((p) => p.valor === provedor)
  const cena = cenaId === 'livre' ? { rotulo: 'Cena personalizada', prompt: cenaLivre.trim() } : CENAS_IA.find((c) => c.id === cenaId)
  const historico = useMemo(
    () => Object.values(dados.midias).filter((m) => m.origem === 'ia').sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0)),
    [dados.midias],
  )
  const comFoto = Object.values(dados.produtos).filter((p) => p.fotoId)
  const pronto = !!fotoBase && descricao.trim().length >= 3 && !!cena?.prompt

  const salvarConfig = () => {
    gravarChave(provedor, chave.trim())
    api.atualizarConfig((c) => ({ ...c, ia: { ...c.ia, provedor, [provedor === 'openai' ? 'modeloOpenai' : 'modeloGemini']: modelo.trim() } }))
    toast('Configuração salva neste navegador')
  }

  const escolherFoto = async (file) => {
    try {
      const bruto = await lerArquivoComoDataURL(file)
      const { dataUrl } = await comprimirImagem(bruto, { ladoMax: 1400, limite: 1800000 })
      setFoto(dataUrl)
      setFotoProdutoId('')
      setResultado(null)
    } catch (e) {
      toast(e.message || 'Não foi possível abrir a foto.', 'bad')
    }
  }

  const gerar = async () => {
    setErro('')
    setGerando(true)
    try {
      const img = await gerarImagem({ provedor, chave: chave.trim(), modelo: modelo.trim(), descricao: descricao.trim(), cena: cena.prompt, foto: fotoBase })
      const { dataUrl } = await comprimirImagem(img, { ladoMax: 1100, limite: api.limiteImagem() })
      const id = await api.salvarImagem(dataUrl, {
        origem: 'ia',
        descricao: descricao.trim(),
        cenaRotulo: cena.rotulo,
        provedor,
        modelo: modelo.trim(),
        produtoId: fotoProdutoId || params?.produtoId || null,
      })
      setResultado({ id, url: dataUrl })
      setRevisando(false)
      gravarChave(provedor, chave.trim())
      toast('Imagem gerada e salva em Minhas imagens')
    } catch (e) {
      setErro(e.message || 'Não foi possível gerar a imagem.')
    } finally {
      setGerando(false)
    }
  }

  const excluir = async (m) => {
    const usado = Object.values(dados.produtos).filter((p) => p.fotoId === m.id)
    const okk = await confirmar({
      titulo: 'Excluir esta imagem?',
      texto: usado.length ? `Ela é a foto de ${usado.map((p) => p.nome).join(', ')}. O produto fica sem foto.` : 'A imagem sai de Minhas imagens.',
      acao: 'Excluir',
      perigo: true,
    })
    if (!okk) return
    for (const p of usado) api.salvar('produtos', { ...p, fotoId: null })
    api.apagarImagem(m.id)
    if (resultado?.id === m.id) setResultado(null)
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Imagens com IA</span>
          <h1>Seu produto em outra cena</h1>
          <p>Mande a foto da peça, descreva o produto e escolha o ambiente. A IA monta uma foto de vitrine para o catálogo e os anúncios.</p>
        </div>
      </div>

      {noClaude && (
        <Aviso tipo="warn">
          Dentro do Claude o app não consegue se conectar ao Google ou à OpenAI, então a geração fica desligada aqui. Na versão instalada no seu domínio ela funciona com a sua chave. Minhas imagens e a troca de foto do catálogo funcionam normalmente.
        </Aviso>
      )}

      <div className="split">
        <div className="stack">
          <section className="card stack">
            <div className="card-head" style={{ marginBottom: 0 }}>
              <div>
                <h3>1. Foto da peça</h3>
                <p>JPG, PNG ou WebP até 12 MB, com a peça inteira e fundo simples.</p>
              </div>
            </div>
            <details className="more">
              <summary>Como fotografar para um bom resultado</summary>
              <div className="more-body small">
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                  <li>Luz de janela, sem flash e sem sombra forte em cima da peça.</li>
                  <li>Fundo liso (cartolina branca ou cinza) e nada mais na foto.</li>
                  <li>Peça inteira no quadro, com um pouco de margem em volta.</li>
                  <li>Câmera na altura da peça, sem distorção de grande-angular.</li>
                  <li>Cores fiéis: confira se o filamento aparece como é ao vivo.</li>
                </ul>
              </div>
            </details>
            <div className="grid-2">
              <SeletorArquivo onArquivo={escolherFoto}>
                <Icon nome="subir" />
                <span className="strong small">{foto ? 'Trocar foto' : 'Enviar foto'}</span>
                <span className="tiny muted">Clique ou arraste aqui</span>
              </SeletorArquivo>
              <Selecao
                rotulo="Ou use a foto de um produto"
                valor={fotoProdutoId}
                vazio="Escolha um produto com foto"
                onMuda={(v) => {
                  setFotoProdutoId(v)
                  setFoto(null)
                  setResultado(null)
                  if (v && !descricao) setDescricao(dados.produtos[v]?.nome || '')
                }}
                opcoes={comFoto.map((p) => ({ valor: p.id, rotulo: p.nome }))}
              />
            </div>
            {fotoBase && (
              <div className="row">
                <img src={fotoBase} alt="Foto escolhida" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
                <span className="small muted">Foto pronta para enviar.</span>
              </div>
            )}
          </section>

          <section className="card stack">
            <h3>2. Produto e cena</h3>
            <Texto rotulo="Descreva o produto de forma simples" valor={descricao} onMuda={setDescricao} maxLength={160} placeholder="Ex.: luminária geométrica com base azul" />
            <Field rotulo="Cena">
              <div className="chip-row">
                {CENAS_IA.map((c) => (
                  <button key={c.id} type="button" className="chip" aria-pressed={cenaId === c.id} onClick={() => setCenaId(c.id)}>
                    {c.rotulo}
                  </button>
                ))}
                <button type="button" className="chip" aria-pressed={cenaId === 'livre'} onClick={() => setCenaId('livre')}>
                  Descrever outra
                </button>
              </div>
            </Field>
            {cenaId === 'livre' && <Texto rotulo="Descreva a cena" multilinha valor={cenaLivre} onMuda={setCenaLivre} maxLength={400} placeholder="Ex.: em cima de um aparador de madeira escura, com uma planta ao lado e luz de fim de tarde" />}
          </section>

          <section className="card stack">
            <div className="card-head" style={{ marginBottom: 0 }}>
              <div>
                <h3>3. Provedor e chave</h3>
                <p>Você usa a sua conta. A chave fica só neste navegador e não vai para o banco de dados.</p>
              </div>
            </div>
            <Seg valor={provedor} onMuda={setProvedor} rotulo="Provedor" opcoes={PROVEDORES.map((p) => ({ valor: p.valor, rotulo: p.rotulo }))} />
            <div className="grid-2">
              <Texto rotulo="Chave da API" type="password" autoComplete="off" valor={chave} onMuda={setChave} placeholder={provedor === 'openai' ? 'sk-...' : 'AIza...'} />
              <Texto rotulo="Modelo" valor={modelo} onMuda={setModelo} dica={`Padrão: ${prov?.modeloPadrao}`} />
            </div>
            <div className="row between">
              <a className="small" href={provedor === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://aistudio.google.com/apikey'} target="_blank" rel="noopener noreferrer">
                Onde pego a chave? <Icon nome="externo" tamanho={13} />
              </a>
              <Btn tamanho="sm" onClick={salvarConfig}>
                Salvar configuração
              </Btn>
            </div>
          </section>

          {!revisando ? (
            <Btn variante="primary" icone="ia" disabled={!pronto} onClick={() => setRevisando(true)}>
              Revisar antes de gerar
            </Btn>
          ) : (
            <section className="card stack" style={{ borderColor: 'var(--accent)' }}>
              <h3>Confira antes de gerar</h3>
              <div className="row top">
                {fotoBase && <img src={fotoBase} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />}
                <div className="stack-sm grow">
                  <span>
                    <strong>Produto:</strong> {descricao}
                  </span>
                  <span>
                    <strong>Cena:</strong> {cena?.rotulo}
                  </span>
                  <span className="small muted">
                    {prov?.rotulo} · {modelo} · custo aproximado: {prov?.custo}, cobrado na sua conta do provedor.
                  </span>
                </div>
              </div>
              <Aviso>A foto e a descrição vão para o provedor escolhido ao confirmar. A IA pode alterar detalhes: compare com a foto original antes de usar em anúncios.</Aviso>
              {erro && <Aviso tipo="bad">{erro}</Aviso>}
              <div className="actions">
                <Btn variante="primary" icone="ia" disabled={gerando || noClaude || !chave.trim()} onClick={gerar}>
                  {gerando ? 'Gerando… pode levar até 1 minuto' : 'Gerar imagem'}
                </Btn>
                <Btn variante="ghost" onClick={() => setRevisando(false)} disabled={gerando}>
                  Voltar
                </Btn>
              </div>
              {!chave.trim() && !noClaude && <span className="small warn-text">Informe a chave da API no passo 3.</span>}
            </section>
          )}
        </div>

        <div className="sticky stack">
          <section className="card stack">
            <h3>Antes e depois</h3>
            <div className="compare">
              <figure>
                <div className="ph layers-bg">{fotoBase ? <img src={fotoBase} alt="Foto original" /> : <span className="tiny muted">Sem foto</span>}</div>
                <figcaption className="tiny muted">Foto original</figcaption>
              </figure>
              <figure>
                <div className="ph layers-bg">{gerando ? <div className="spin" /> : resultado ? <img src={resultado.url} alt="Imagem gerada" /> : <span className="tiny muted">O resultado aparece aqui</span>}</div>
                <figcaption className="tiny muted">Com IA</figcaption>
              </figure>
            </div>
            {resultado && (
              <div className="actions">
                <Btn variante="primary" icone="link" onClick={() => setAssociar(resultado.id)}>
                  Associar a um produto
                </Btn>
                <Btn
                  icone="baixar"
                  onClick={async () => {
                    const r = await baixarArquivo(`imagem-${nomeArquivo(descricao)}.jpg`, dataUrlParaBlob(resultado.url)).catch((e) => toast(e.message, 'bad'))
                    if (r === 'salvo') toast('Imagem pronta')
                  }}
                >
                  Baixar
                </Btn>
                <Btn variante="ghost" icone="reabrir" onClick={() => setRevisando(true)}>
                  Gerar outra versão
                </Btn>
              </div>
            )}
          </section>
        </div>
      </div>

      <section className="stack">
        <div className="row between">
          <h2>Minhas imagens</h2>
          <span className="small muted">{historico.length} imagem(ns)</span>
        </div>
        {historico.length ? (
          <div className="img-grid">
            {historico.map((m) => (
              <TileImagem key={m.id} m={m} onAssociar={setAssociar} onExcluir={excluir} />
            ))}
          </div>
        ) : (
          <p className="muted small">As imagens geradas ficam salvas aqui. Baixar ou associar ao catálogo não gera custo.</p>
        )}
      </section>

      <ModalAssociar aberto={!!associar} onFechar={() => setAssociar(null)} imagemId={associar} produtoInicial={params?.produtoId && dados.produtos[params.produtoId]?.noCatalogo ? params.produtoId : null} />
    </div>
  )
}
