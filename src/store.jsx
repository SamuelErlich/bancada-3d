import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { COLECOES, abrirPermissoes, dentroDoClaude, escolherBackend } from './lib/storage.js'
import { configPadrao, dadosExemplo } from './lib/defaults.js'
import { novoId } from './lib/format.js'
import { contextoDe } from './lib/pricing.js'

const StoreCtx = createContext(null)
const ToastCtx = createContext(null)

const cacheImagens = new Map()
const ouvintesImagem = new Map()

function mesclarConfig(salva) {
  const base = configPadrao()
  if (!salva) return base
  return {
    ...base,
    ...salva,
    negocio: { ...base.negocio, ...(salva.negocio || {}) },
    custos: { ...base.custos, ...(salva.custos || {}) },
    precificacao: { ...base.precificacao, ...(salva.precificacao || {}) },
    orcamento: { ...base.orcamento, ...(salva.orcamento || {}) },
    numeracao: { ...base.numeracao, ...(salva.numeracao || {}) },
    sku: { ...base.sku, ...(salva.sku || {}) },
    ia: { ...base.ia, ...(salva.ia || {}) },
    canais: Array.isArray(salva.canais) && salva.canais.length ? salva.canais : base.canais,
    custosFixos: Array.isArray(salva.custosFixos) ? salva.custosFixos : [],
  }
}

function porId(lista) {
  const m = {}
  for (const d of lista || []) if (d && d.id) m[d.id] = d
  return m
}

export function ToastProvider({ children }) {
  const [itens, setItens] = useState([])
  const toast = useCallback((msg, tipo = 'ok') => {
    const id = novoId()
    setItens((v) => [...v.slice(-3), { id, msg, tipo }])
    setTimeout(() => setItens((v) => v.filter((t) => t.id !== id)), tipo === 'bad' ? 6500 : 3200)
  }, [])
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {itens.map((t) => (
          <div key={t.id} className={'toast' + (t.tipo === 'bad' ? ' bad' : '')}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}

function mensagemErro(e) {
  if (!e) return 'Algo deu errado ao salvar.'
  if (e.code === 'quota_exceeded') return 'O espaço de armazenamento encheu. Apague itens antigos ou exporte um backup.'
  if (e.code === 'resource_exhausted') return 'Muitas alterações seguidas. Espere alguns segundos e tente de novo.'
  if (e.code === 'revoked' || e.code === 'not_granted') return 'Seu acesso para salvar mudou. Recarregue a página.'
  if (e.code === 'invalid_argument') return 'Não foi possível salvar este item (dados inválidos ou grandes demais).'
  return e.message || 'Algo deu errado ao salvar.'
}

export function StoreProvider({ children }) {
  const toast = useToast()
  const [estado, setEstado] = useState({ carregando: true, erro: null })
  const [dados, setDados] = useState(null)
  const backendRef = useRef(null)
  const dadosRef = useRef(null)
  const timerConfig = useRef(null)
  const [salvando, setSalvando] = useState(0)

  dadosRef.current = dados

  // Cada abertura tem um número: se a pessoa escolher "abrir sem a conta" no meio do caminho,
  // a tentativa antiga é ignorada quando terminar.
  const execucao = useRef(0)

  const iniciar = useCallback(async (opcoes = {}) => {
    const minha = ++execucao.current
    const vale = () => execucao.current === minha
    const podeLocal = dentroDoClaude()
    setEstado({ carregando: true, erro: null, etapa: 'inicio', podeLocal })
    try {
      const backend = await escolherBackend({
        forcarLocal: !!opcoes.forcarLocal,
        aoEtapa: (etapa) => vale() && setEstado((s) => (s.carregando ? { ...s, etapa } : s)),
      })
      if (!vale()) return
      if (backend.tipo === 'conta') setEstado((s) => (s.carregando ? { ...s, etapa: s.etapa === 'permissao' ? 'permissao' : 'lendo' } : s))
      const bruto = await backend.carregar()
      if (!vale()) return
      backendRef.current = backend
      cacheImagens.clear()
      const novo = { config: mesclarConfig(bruto.config) }
      for (const c of COLECOES) novo[c] = porId(bruto.colecoes[c])
      setDados(novo)
      setEstado({
        carregando: false,
        erro: null,
        tipo: backend.tipo,
        descricao: backend.descricao,
        aviso: backend.aviso || null,
        motivo: backend.motivo || null,
        podeLocal,
      })
    } catch (e) {
      if (!vale()) return
      setEstado({ carregando: false, erro: (e && e.message) || 'Não foi possível abrir seus dados.', podeLocal })
    }
  }, [])

  const recarregar = useCallback(() => iniciar(), [iniciar])
  const abrirLocal = useCallback(() => iniciar({ forcarLocal: true }), [iniciar])
  const liberarAcesso = useCallback(async () => {
    await abrirPermissoes()
    iniciar()
  }, [iniciar])

  useEffect(() => {
    iniciar()
  }, [iniciar])

  const rodar = useCallback(
    (promessa) => {
      setSalvando((n) => n + 1)
      return Promise.resolve(promessa)
        .catch((e) => {
          toast(mensagemErro(e), 'bad')
          throw e
        })
        .finally(() => setSalvando((n) => Math.max(0, n - 1)))
    },
    [toast],
  )

  const api = useMemo(() => {
    const salvar = (col, doc) => {
      const agora = Date.now()
      const d = { ...doc, id: doc.id || novoId(), atualizadoEm: agora, criadoEm: doc.criadoEm || agora }
      setDados((prev) => ({ ...prev, [col]: { ...prev[col], [d.id]: d } }))
      rodar(backendRef.current.salvar(col, d)).catch(() => {})
      return d
    }
    /** Salva vários documentos de uma vez (importação de planilha): um só render e gravação em lotes. */
    const salvarVarios = async (col, docs) => {
      const agora = Date.now()
      const prontos = docs.map((doc) => ({ ...doc, id: doc.id || novoId(), atualizadoEm: agora, criadoEm: doc.criadoEm || agora }))
      if (!prontos.length) return []
      setDados((prev) => {
        const mapa = { ...prev[col] }
        for (const d of prontos) mapa[d.id] = d
        return { ...prev, [col]: mapa }
      })
      for (let i = 0; i < prontos.length; i += 4) {
        await rodar(Promise.all(prontos.slice(i, i + 4).map((d) => backendRef.current.salvar(col, d)))).catch(() => {})
      }
      return prontos
    }
    const apagar = (col, id) => {
      setDados((prev) => {
        const copia = { ...prev[col] }
        delete copia[id]
        return { ...prev, [col]: copia }
      })
      rodar(backendRef.current.apagar(col, id)).catch(() => {})
    }
    const atualizarConfig = (fn) => {
      setDados((prev) => {
        const cfg = typeof fn === 'function' ? fn(prev.config) : { ...prev.config, ...fn }
        clearTimeout(timerConfig.current)
        timerConfig.current = setTimeout(() => {
          rodar(backendRef.current.salvarConfig(dadosRef.current.config)).catch(() => {})
        }, 500)
        return { ...prev, config: cfg }
      })
    }
    /** Reserva o próximo número (orçamento ou pedido) e avança a sequência. */
    const reservarNumero = (tipo) => {
      const chave = tipo === 'pedido' ? 'proximoPedido' : 'proximoOrcamento'
      const atual = Math.max(1, Math.floor(dadosRef.current.config.numeracao?.[chave] || 1))
      atualizarConfig((c) => ({ ...c, numeracao: { ...c.numeracao, [chave]: atual + 1 } }))
      return atual
    }
    const salvarImagem = async (dataUrl, meta = {}) => {
      const id = novoId()
      cacheImagens.set(id, dataUrl)
      await rodar(backendRef.current.salvarImagem(id, dataUrl))
      salvar('midias', { id, origem: meta.origem || 'foto', ...meta })
      return id
    }
    const apagarImagem = (id) => {
      if (!id) return
      cacheImagens.delete(id)
      rodar(backendRef.current.apagarImagem(id)).catch(() => {})
      if (dadosRef.current.midias[id]) apagar('midias', id)
    }
    const lerImagem = async (id) => {
      if (!id) return null
      if (cacheImagens.has(id)) return cacheImagens.get(id)
      const url = await backendRef.current.lerImagem(id)
      if (url) cacheImagens.set(id, url)
      return url
    }
    const carregarExemplo = async () => {
      const ex = dadosExemplo()
      const tarefas = []
      for (const col of ['impressoras', 'washcures', 'filamentos', 'resinas', 'insumos', 'produtos', 'clientes', 'orcamentos', 'pedidos']) {
        for (const doc of ex[col]) tarefas.push([col, doc])
      }
      setDados((prev) => {
        const novo = { ...prev }
        for (const [col, doc] of tarefas) novo[col] = { ...novo[col], [doc.id]: doc }
        const c = prev.config
        novo.config = {
          ...c,
          onboarding: true,
          exemplo: true,
          custos: { ...c.custos, ...ex.config.custos },
          custosFixos: [...(c.custosFixos || []).filter((f) => !String(f.id).startsWith('ex-')), ...ex.config.custosFixos],
          producaoMensalUnidades: c.producaoMensalUnidades || ex.config.producaoMensalUnidades,
          numeracao: {
            proximoOrcamento: Math.max(c.numeracao.proximoOrcamento, ex.config.numeracao.proximoOrcamento),
            proximoPedido: Math.max(c.numeracao.proximoPedido, ex.config.numeracao.proximoPedido),
          },
          negocio: c.negocio.nome ? c.negocio : { ...c.negocio, ...ex.config.negocio },
        }
        return novo
      })
      setSalvando((n) => n + 1)
      try {
        for (let i = 0; i < tarefas.length; i += 4) {
          await Promise.all(tarefas.slice(i, i + 4).map(([col, doc]) => backendRef.current.salvar(col, doc)))
        }
        await backendRef.current.salvarConfig(dadosRef.current.config)
      } catch (e) {
        toast(mensagemErro(e), 'bad')
      } finally {
        setSalvando((n) => Math.max(0, n - 1))
      }
    }
    const apagarExemplos = async () => {
      const atual = dadosRef.current
      const tarefas = []
      for (const col of COLECOES) for (const doc of Object.values(atual[col])) if (doc.exemplo) tarefas.push([col, doc.id])
      const restaram = (col) => Object.values(atual[col]).some((d) => !d.exemplo)
      setDados((prev) => {
        const novo = { ...prev }
        for (const [col, id] of tarefas) {
          novo[col] = { ...novo[col] }
          delete novo[col][id]
        }
        const c = prev.config
        novo.config = {
          ...c,
          exemplo: false,
          custosFixos: (c.custosFixos || []).filter((f) => !String(f.id).startsWith('ex-')),
          producaoMensalUnidades: (c.custosFixos || []).some((f) => !String(f.id).startsWith('ex-')) ? c.producaoMensalUnidades : 0,
          numeracao: {
            proximoOrcamento: restaram('orcamentos') ? c.numeracao.proximoOrcamento : 1,
            proximoPedido: restaram('pedidos') ? c.numeracao.proximoPedido : 1,
          },
          negocio: c.negocio.nome === 'Ateliê Exemplo 3D' ? { ...c.negocio, nome: '', instagram: '' } : c.negocio,
        }
        return novo
      })
      setSalvando((n) => n + 1)
      try {
        for (let i = 0; i < tarefas.length; i += 4) {
          await Promise.all(tarefas.slice(i, i + 4).map(([col, id]) => backendRef.current.apagar(col, id)))
        }
        await backendRef.current.salvarConfig(dadosRef.current.config)
      } catch (e) {
        toast(mensagemErro(e), 'bad')
      } finally {
        setSalvando((n) => Math.max(0, n - 1))
      }
    }
    /** Substitui tudo pelos dados de um backup. */
    const importarTudo = async (backup) => {
      const atual = dadosRef.current
      const apagarAntes = []
      for (const col of COLECOES) for (const id of Object.keys(atual[col])) apagarAntes.push([col, id])
      const novos = []
      for (const col of COLECOES) for (const doc of backup[col] || []) if (doc && doc.id) novos.push([col, doc])
      const imagens = Object.entries(backup.imagens || {})
      setSalvando((n) => n + 1)
      try {
        for (let i = 0; i < apagarAntes.length; i += 4) {
          await Promise.all(apagarAntes.slice(i, i + 4).map(([col, id]) => backendRef.current.apagar(col, id)))
        }
        for (let i = 0; i < novos.length; i += 4) {
          await Promise.all(novos.slice(i, i + 4).map(([col, doc]) => backendRef.current.salvar(col, doc)))
        }
        for (const [id, url] of imagens) {
          cacheImagens.set(id, url)
          await backendRef.current.salvarImagem(id, url)
        }
        const cfg = mesclarConfig(backup.config)
        await backendRef.current.salvarConfig(cfg)
        const novo = { config: cfg }
        for (const col of COLECOES) novo[col] = porId(backup[col])
        setDados(novo)
      } finally {
        setSalvando((n) => Math.max(0, n - 1))
      }
    }
    const apagarTudo = async () => {
      const atual = dadosRef.current
      const tarefas = []
      for (const col of COLECOES) for (const id of Object.keys(atual[col])) tarefas.push([col, id])
      const imgs = new Set(Object.keys(atual.midias))
      if (atual.config.negocio?.logoId) imgs.add(atual.config.negocio.logoId)
      for (const p of Object.values(atual.produtos)) if (p.fotoId) imgs.add(p.fotoId)
      setSalvando((n) => n + 1)
      try {
        for (let i = 0; i < tarefas.length; i += 4) {
          await Promise.all(tarefas.slice(i, i + 4).map(([col, id]) => backendRef.current.apagar(col, id)))
        }
        for (const id of imgs) await backendRef.current.apagarImagem(id).catch(() => {})
        const cfg = configPadrao()
        await backendRef.current.salvarConfig(cfg)
        const novo = { config: cfg }
        for (const col of COLECOES) novo[col] = {}
        setDados(novo)
        cacheImagens.clear()
      } finally {
        setSalvando((n) => Math.max(0, n - 1))
      }
    }
    const exportarTudo = async () => {
      const atual = dadosRef.current
      const backup = { app: 'Bancada 3D', versao: 1, exportadoEm: new Date().toISOString(), config: atual.config, imagens: {} }
      for (const col of COLECOES) backup[col] = Object.values(atual[col])
      const ids = new Set(Object.keys(atual.midias))
      if (atual.config.negocio?.logoId) ids.add(atual.config.negocio.logoId)
      for (const p of Object.values(atual.produtos)) if (p.fotoId) ids.add(p.fotoId)
      for (const id of ids) {
        try {
          const url = await lerImagem(id)
          if (url) backup.imagens[id] = url
        } catch (e) {
          /* imagem indisponível */
        }
      }
      return backup
    }
    return {
      salvar,
      salvarVarios,
      apagar,
      atualizarConfig,
      reservarNumero,
      salvarImagem,
      apagarImagem,
      lerImagem,
      carregarExemplo,
      apagarExemplos,
      importarTudo,
      apagarTudo,
      exportarTudo,
      limiteImagem: () => backendRef.current?.limiteImagem || 240000,
    }
  }, [rodar, toast])

  const ctx = useMemo(() => (dados ? contextoDe(dados) : null), [dados])

  const valor = useMemo(
    () => ({ estado, dados, ctx, api, salvando: salvando > 0, recarregar, abrirLocal, liberarAcesso }),
    [estado, dados, ctx, api, salvando, recarregar, abrirLocal, liberarAcesso],
  )

  return <StoreCtx.Provider value={valor}>{children}</StoreCtx.Provider>
}

export function useStore() {
  return useContext(StoreCtx)
}

/** Carrega uma imagem salva (foto, logo ou imagem com IA) pelo id. */
export function useImagem(id) {
  const { api } = useStore()
  const [url, setUrl] = useState(() => (id ? cacheImagens.get(id) || null : null))
  useEffect(() => {
    let vivo = true
    if (!id) {
      setUrl(null)
      return
    }
    if (cacheImagens.has(id)) {
      setUrl(cacheImagens.get(id))
      return
    }
    setUrl(null)
    api
      .lerImagem(id)
      .then((u) => vivo && setUrl(u))
      .catch(() => vivo && setUrl(null))
    return () => {
      vivo = false
    }
  }, [id, api])
  return url
}

export { cacheImagens, ouvintesImagem }
