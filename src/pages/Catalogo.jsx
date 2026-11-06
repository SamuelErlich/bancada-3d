import { useMemo, useState, useEffect } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Busca, Vazio, Modal, Imagem, SeletorArquivo, Texto, useConfirmar, Aviso, Pill } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import ModalExportar from '../components/Exportar.jsx'
import { Composicao, Canais } from '../components/PainelPreco.jsx'
import { precificar } from '../lib/pricing.js'
import { contem, fmtBRL, fmtPct } from '../lib/format.js'
import { comprimirImagem, lerArquivoComoDataURL } from '../lib/files.js'
import { sugerirSku, skuValido } from '../lib/negocio.js'

/** Troca a foto de um produto (apaga a anterior se ela era uma foto enviada, não uma imagem com IA). */
export async function trocarFotoProduto(api, dados, produto, dataUrl, origem = 'foto') {
  const anterior = produto.fotoId
  const id = await api.salvarImagem(dataUrl, { origem, produtoId: produto.id })
  api.salvar('produtos', { ...produto, fotoId: id })
  if (anterior && dados.midias[anterior]?.origem !== 'ia') api.apagarImagem(anterior)
  return id
}

function canalVitrine(res) {
  return res.canais.find((c) => c.canal.id === 'shopee') || res.canais.find((c) => (c.canal.taxaPct || 0) > 0 || c.canal.faixas) || null
}

function DetalheProduto({ produtoId, onFechar, ir }) {
  const { dados, ctx, api } = useStore()
  const toast = useToast()
  const confirmar = useConfirmar()
  const produto = dados.produtos[produtoId]
  const [descricao, setDescricao] = useState(produto?.descricao || '')
  const [sku, setSku] = useState(produto?.sku || '')
  const [revisando, setRevisando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  useEffect(() => {
    setDescricao(produto?.descricao || '')
    setSku(produto?.sku || '')
    setRevisando(false)
  }, [produtoId]) // eslint-disable-line
  if (!produto) return null
  const res = precificar(produto, ctx)
  const outrosSkus = Object.values(dados.produtos)
    .filter((p) => p.id !== produto.id)
    .map((p) => p.sku)
    .filter(Boolean)
  const skuNorm = sku.trim().toUpperCase().replace(/\s+/g, '-')
  const skuRepetido = outrosSkus.map((s) => s.toUpperCase()).includes(skuNorm)
  const skuOk = skuValido(skuNorm) && !skuRepetido

  const enviarFoto = async (file) => {
    setEnviando(true)
    try {
      const bruto = await lerArquivoComoDataURL(file)
      const { dataUrl } = await comprimirImagem(bruto, { ladoMax: 1100, limite: api.limiteImagem() })
      await trocarFotoProduto(api, dados, produto, dataUrl, 'foto')
      toast('Foto atualizada')
    } catch (e) {
      toast(e.message || 'Não foi possível usar esta foto.', 'bad')
    } finally {
      setEnviando(false)
    }
  }

  const removerFoto = async () => {
    const okk = await confirmar({ titulo: 'Remover a foto?', texto: 'O produto fica sem foto no catálogo e nos próximos orçamentos.', acao: 'Remover', perigo: true })
    if (!okk) return
    const anterior = produto.fotoId
    api.salvar('produtos', { ...produto, fotoId: null })
    if (anterior && dados.midias[anterior]?.origem !== 'ia') api.apagarImagem(anterior)
  }

  const salvarDescricao = () => {
    if ((produto.descricao || '') === descricao.trim()) return
    api.salvar('produtos', { ...produto, descricao: descricao.trim() })
    toast('Descrição salva')
  }

  const confirmarSku = () => {
    api.salvar('produtos', { ...produto, sku: skuNorm })
    setSku(skuNorm)
    setRevisando(false)
    toast('SKU salvo')
  }

  return (
    <Modal aberto onFechar={onFechar} largo titulo={produto.nome} subtitulo={produto.sku ? `SKU ${produto.sku}` : 'Sem SKU'}>
      <div className="split-wide">
        <div className="stack">
          <div className="prod-photo layers-bg" style={{ borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
            <Imagem id={produto.fotoId} alt={`Foto de ${produto.nome}`} fallback={<span className="prod-initial">{produto.nome.charAt(0).toUpperCase()}</span>} />
          </div>
          <SeletorArquivo onArquivo={enviarFoto}>
            <Icon nome="subir" />
            <span className="strong small">{enviando ? 'Enviando…' : produto.fotoId ? 'Trocar foto' : 'Enviar foto do produto'}</span>
            <span className="tiny muted">JPG, PNG ou WebP até 12 MB. Clique ou arraste.</span>
          </SeletorArquivo>
          <div className="actions">
            <Btn tamanho="sm" icone="ia" onClick={() => ir('imagens', { produtoId: produto.id })}>
              Criar imagem com IA
            </Btn>
            {produto.fotoId && (
              <Btn tamanho="sm" variante="ghost" icone="lixo" onClick={removerFoto}>
                Remover foto
              </Btn>
            )}
          </div>
          <Texto rotulo="Descrição" multilinha valor={descricao} onMuda={setDescricao} onBlur={salvarDescricao} maxLength={400} dica="Salva ao sair do campo." />
          <div className="well stack-sm">
            <div className="row between">
              <span className="strong">SKU</span>
              {produto.sku && <span className="num small">{produto.sku}</span>}
            </div>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input
                className="input num"
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value.toUpperCase())
                  setRevisando(false)
                }}
                placeholder="Ex.: ABC-VAS-001"
                aria-label="SKU"
                maxLength={40}
              />
              <Btn tamanho="sm" icone="sku" onClick={() => setSku(sugerirSku(produto, dados.config, outrosSkus))}>
                Gerar SKU
              </Btn>
            </div>
            {!revisando ? (
              <Btn tamanho="sm" disabled={!sku.trim() || skuNorm === produto.sku} onClick={() => setRevisando(true)}>
                Revisar SKU
              </Btn>
            ) : (
              <div className="stack-sm">
                {skuOk ? (
                  <Aviso tipo="ok">
                    O código <strong className="num">{skuNorm}</strong> está livre. Ele não muda se você renomear o produto ou recalcular o preço. SKU não substitui código de barras (EAN/GTIN).
                  </Aviso>
                ) : (
                  <Aviso tipo="bad">{skuRepetido ? 'Outro produto já usa esse SKU.' : 'Use de 2 a 40 caracteres: letras, números e hífen.'}</Aviso>
                )}
                <div className="actions">
                  <Btn tamanho="sm" variante="primary" disabled={!skuOk} onClick={confirmarSku}>
                    Confirmar e salvar
                  </Btn>
                  <Btn tamanho="sm" variante="ghost" onClick={() => setRevisando(false)}>
                    Voltar
                  </Btn>
                </div>
              </div>
            )}
            <p className="tiny muted">O prefixo sugerido vem do nome do seu negócio (ou do prefixo definido em Meu negócio).</p>
          </div>
        </div>
        <div className="stack">
          <div className="price-hero">
            <span className="label">{res.precoManual ? 'Seu preço' : 'Preço sugerido'} · venda direta</span>
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
          {res.avisos.length > 0 && <Aviso tipo="warn">{res.avisos.join(' ')} Abra o cálculo para corrigir.</Aviso>}
          <div className="card stack-sm">
            <h4>Preço por canal</h4>
            <Canais res={res} imposto={ctx.impostoPct} />
          </div>
          <div className="card stack-sm">
            <h4>De onde vem o custo</h4>
            <Composicao res={res} compacto />
          </div>
          <div className="actions">
            <Btn variante="primary" icone="orcamento" onClick={() => ir('orcamentos', { novo: true, itens: [{ produtoId: produto.id, quantidade: 1 }] })}>
              Orçar
            </Btn>
            <Btn icone="editar" onClick={() => ir('calculadora', { produtoId: produto.id })}>
              Editar cálculo
            </Btn>
            <Btn
              variante="ghost"
              icone="estrela"
              onClick={() => {
                api.salvar('produtos', { ...produto, noCatalogo: false })
                toast('Retirado do catálogo')
                onFechar()
              }}
            >
              Retirar do catálogo
            </Btn>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default function Catalogo({ ir, params }) {
  const { dados, ctx } = useStore()
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(params?.produtoId || null)
  const [selecionando, setSelecionando] = useState(false)
  const [sel, setSel] = useState(() => new Set())
  const [exportar, setExportar] = useState(false)

  const itens = useMemo(
    () =>
      Object.values(dados.produtos)
        .filter((p) => p.noCatalogo)
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((p) => ({ p, res: precificar(p, ctx) })),
    [dados.produtos, ctx],
  )
  const lista = itens.filter(({ p }) => contem(p.nome, busca) || contem(p.sku, busca) || contem(p.descricao, busca))
  const alternar = (id) =>
    setSel((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Sua linha de venda</span>
          <h1>Catálogo</h1>
          <p>Os produtos que você vende com frequência, com foto, SKU e preço pronto para o próximo orçamento.</p>
        </div>
        <div className="actions">
          {itens.length > 0 && (
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
          <Btn icone="calculo" onClick={() => ir('calculos')}>
            Promover um cálculo
          </Btn>
          <Btn variante="primary" icone="mais2" onClick={() => ir('calculadora')}>
            Novo cálculo
          </Btn>
        </div>
      </div>

      {!itens.length ? (
        <Vazio titulo="Seu catálogo está vazio" texto="Salve um cálculo e use “Promover ao catálogo” (a estrela) nos produtos que você quer manter à venda.">
          <Btn variante="primary" icone="calculo" onClick={() => ir('calculos')}>
            Ver cálculos
          </Btn>
        </Vazio>
      ) : (
        <>
          <div className="row">
            <div className="grow" style={{ maxWidth: 420 }}>
              <Busca valor={busca} onMuda={setBusca} placeholder="Buscar produto" />
            </div>
            {selecionando && (
              <div className="actions">
                <span className="small">
                  <strong>{sel.size}</strong> selecionado(s)
                </span>
                <Btn tamanho="sm" onClick={() => setSel(new Set(itens.map((x) => x.p.id)))}>
                  Selecionar todos
                </Btn>
                <Btn tamanho="sm" variante="primary" icone="baixar" disabled={!sel.size} onClick={() => setExportar(true)}>
                  Exportar
                </Btn>
              </div>
            )}
          </div>
          <div className="catalog">
            {lista.map(({ p, res }) => {
              const vitrine = canalVitrine(res)
              return (
                <article className="prod" key={p.id} style={selecionando && sel.has(p.id) ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' } : undefined}>
                  <button type="button" className="prod-photo layers-bg" style={{ border: 0, padding: 0, cursor: 'pointer' }} onClick={() => (selecionando ? alternar(p.id) : setAberto(p.id))} aria-label={`Abrir ${p.nome}`}>
                    <Imagem id={p.fotoId} alt="" fallback={<span className="prod-initial">{p.nome.charAt(0).toUpperCase()}</span>} />
                    {selecionando && (
                      <span style={{ position: 'absolute', top: 10, left: 10 }} className={'pill ' + (sel.has(p.id) ? 'accent' : '')}>
                        {sel.has(p.id) ? 'Selecionado' : 'Selecionar'}
                      </span>
                    )}
                    {p.exemplo && (
                      <span style={{ position: 'absolute', top: 10, right: 10 }} className="pill">
                        Exemplo
                      </span>
                    )}
                  </button>
                  <div className="prod-body">
                    <div className="stack-sm" style={{ gap: 2 }}>
                      <h3>{p.nome}</h3>
                      <span className="tiny muted num">{p.sku || 'sem SKU'}</span>
                    </div>
                    <div className="prod-figs">
                      <div className="stat">
                        <span className="label">Preço</span>
                        <span className="num">{fmtBRL(res.preco)}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Lucro</span>
                        <span className={'num' + (res.lucro < 0 ? ' bad-text' : '')}>{fmtBRL(res.lucro)}</span>
                      </div>
                      <div className="stat">
                        <span className="label">Margem</span>
                        <span className="num">{fmtPct(res.margem)}</span>
                      </div>
                    </div>
                    {vitrine && Number.isFinite(vitrine.preco) && (
                      <span className="tiny muted">
                        {vitrine.canal.nome}: <span className="num">{fmtBRL(vitrine.preco)}</span>
                      </span>
                    )}
                    <div className="actions" style={{ marginTop: 'auto' }}>
                      <Btn tamanho="sm" variante="primary" onClick={() => ir('orcamentos', { novo: true, itens: [{ produtoId: p.id, quantidade: 1 }] })}>
                        Orçar
                      </Btn>
                      <Btn tamanho="sm" onClick={() => setAberto(p.id)}>
                        Detalhes
                      </Btn>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          {!lista.length && <p className="muted">Nada encontrado.</p>}
        </>
      )}
      {aberto && dados.produtos[aberto] && <DetalheProduto produtoId={aberto} onFechar={() => setAberto(null)} ir={ir} />}
      <ModalExportar aberto={exportar} onFechar={() => setExportar(false)} ids={[...sel]} />
    </div>
  )
}
