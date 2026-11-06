// Onde os dados ficam salvos.
// 1) Dentro do Claude (artifact): banco privado da conta de quem abre (capacidade "db").
// 2) App do iPhone/iPad: arquivos no próprio aparelho (src/lib/arquivosBackend.js).
// 3) Instalado no seu domínio ou aberto no computador: IndexedDB do navegador.
// 4) Se nada disso estiver disponível: só na memória (some ao fechar).
import { plataforma } from './plataforma.js'

export const COLECOES = [
  'impressoras',
  'washcures',
  'filamentos',
  'resinas',
  'insumos',
  'produtos',
  'clientes',
  'orcamentos',
  'pedidos',
  'midias',
]

function comTempo(promessa, ms, msg) {
  return Promise.race([
    promessa,
    new Promise((_, rej) => setTimeout(() => rej(new Error(msg || 'Tempo esgotado')), ms)),
  ])
}

function limpar(obj) {
  // JSON puro: remove undefined e troca NaN/Infinity por null.
  return JSON.parse(JSON.stringify(obj, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v)))
}

function criarFila() {
  const filas = new Map()
  return function enfileirar(chave, fn) {
    const anterior = filas.get(chave) || Promise.resolve()
    const prox = anterior.catch(() => {}).then(fn)
    filas.set(chave, prox)
    prox.finally(() => {
      if (filas.get(chave) === prox) filas.delete(chave)
    }).catch(() => {})
    return prox
  }
}

// ---------- Conta (capacidade db do Claude) ----------

function backendConta(db, uid) {
  const base = `data/users/${uid}`
  const app = db.doc(`${base}/app`)
  const enfileirar = criarFila()

  async function tentar(fn) {
    try {
      return await fn()
    } catch (e) {
      if (e && e.code === 'unavailable') {
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 600))
        return fn()
      }
      throw e
    }
  }

  async function lerColecao(nome) {
    const col = app.collection(nome)
    const docs = []
    let ultimo = null
    for (let pagina = 0; pagina < 30; pagina++) {
      let q = col
      if (ultimo) q = q.where('_id', '>', ultimo)
      q = q.limit(1000)
      const snap = await tentar(() => q.get())
      snap.docs.forEach((d) => {
        const v = d.data()
        if (v) docs.push({ ...v, id: v.id || d.id })
      })
      if (snap.size < 1000) break
      ultimo = snap.docs[snap.docs.length - 1].id
    }
    return docs
  }

  return {
    tipo: 'conta',
    descricao: 'Salvo na sua conta do Claude',
    async carregar() {
      const cfgSnap = await comTempo(tentar(() => db.doc(`${base}/config`).get()), 25000, 'A sua conta do Claude não respondeu a tempo.')
      const colecoes = {}
      await comTempo(
        Promise.all(
          COLECOES.map(async (nome) => {
            colecoes[nome] = await lerColecao(nome)
          }),
        ),
        45000,
        'A sua conta do Claude não respondeu a tempo.',
      )
      return { config: cfgSnap.exists ? cfgSnap.data() : null, colecoes }
    },
    salvar(col, doc) {
      const ref = app.collection(col).doc(doc.id)
      const corpo = limpar({ ...doc, _id: doc.id })
      return enfileirar(ref.path, () => tentar(() => ref.set(corpo)))
    },
    apagar(col, id) {
      const ref = app.collection(col).doc(id)
      return enfileirar(ref.path, () => tentar(() => ref.delete()))
    },
    salvarConfig(cfg) {
      const ref = db.doc(`${base}/config`)
      const corpo = limpar(cfg)
      return enfileirar(ref.path, () => tentar(() => ref.set(corpo)))
    },
    async lerImagem(id) {
      const snap = await tentar(() => app.collection('imagens').doc(id).get())
      return snap.exists ? snap.data()?.dataUrl || null : null
    },
    salvarImagem(id, dataUrl) {
      const ref = app.collection('imagens').doc(id)
      return enfileirar(ref.path, () => tentar(() => ref.set({ id, _id: id, dataUrl })))
    },
    apagarImagem(id) {
      const ref = app.collection('imagens').doc(id)
      return enfileirar(ref.path, () => tentar(() => ref.delete()))
    },
    limiteImagem: 240000,
  }
}

// ---------- Navegador (IndexedDB) ----------

function abrirIDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Sem IndexedDB'))
    let req
    try {
      req = indexedDB.open('bancada-3d', 1)
    } catch (e) {
      return reject(e)
    }
    req.onupgradeneeded = () => {
      const idb = req.result
      if (!idb.objectStoreNames.contains('docs')) idb.createObjectStore('docs', { keyPath: 'k' })
      if (!idb.objectStoreNames.contains('imagens')) idb.createObjectStore('imagens', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IndexedDB indisponível'))
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'))
  })
}

function tx(idb, loja, modo, fn) {
  return new Promise((resolve, reject) => {
    const t = idb.transaction(loja, modo)
    const store = t.objectStore(loja)
    let resultado
    const r = fn(store)
    if (r) r.onsuccess = () => (resultado = r.result)
    t.oncomplete = () => resolve(resultado)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error || new Error('Transação cancelada'))
  })
}

function backendNavegador(idb) {
  return {
    tipo: 'navegador',
    descricao: 'Salvo neste navegador',
    async carregar() {
      const todos = (await tx(idb, 'docs', 'readonly', (s) => s.getAll())) || []
      const colecoes = Object.fromEntries(COLECOES.map((c) => [c, []]))
      let config = null
      for (const reg of todos) {
        if (reg.k === 'config') config = reg.v
        else if (colecoes[reg.col]) colecoes[reg.col].push(reg.v)
      }
      return { config, colecoes }
    },
    salvar(col, doc) {
      const v = limpar(doc)
      return tx(idb, 'docs', 'readwrite', (s) => s.put({ k: `${col}:${doc.id}`, col, v }))
    },
    apagar(col, id) {
      return tx(idb, 'docs', 'readwrite', (s) => s.delete(`${col}:${id}`))
    },
    salvarConfig(cfg) {
      return tx(idb, 'docs', 'readwrite', (s) => s.put({ k: 'config', col: 'config', v: limpar(cfg) }))
    },
    async lerImagem(id) {
      const r = await tx(idb, 'imagens', 'readonly', (s) => s.get(id))
      return r ? r.dataUrl : null
    },
    salvarImagem(id, dataUrl) {
      return tx(idb, 'imagens', 'readwrite', (s) => s.put({ id, dataUrl }))
    },
    apagarImagem(id) {
      return tx(idb, 'imagens', 'readwrite', (s) => s.delete(id))
    },
    limiteImagem: 900000,
  }
}

// ---------- Memória ----------

function backendMemoria() {
  const imagens = new Map()
  return {
    tipo: 'memoria',
    descricao: 'Não está salvando: os dados somem ao fechar',
    async carregar() {
      return { config: null, colecoes: Object.fromEntries(COLECOES.map((c) => [c, []])) }
    },
    async salvar() {},
    async apagar() {},
    async salvarConfig() {},
    async lerImagem(id) {
      return imagens.get(id) || null
    },
    async salvarImagem(id, dataUrl) {
      imagens.set(id, dataUrl)
    },
    async apagarImagem(id) {
      imagens.delete(id)
    },
    limiteImagem: 900000,
  }
}

export function dentroDoClaude() {
  return typeof window !== 'undefined' && !!(window.claude && typeof window.claude.use === 'function')
}

// Pede uma capacidade do Claude sem travar a abertura: null se falhar ou demorar.
async function usarCapacidade(nome, ms) {
  try {
    return await comTempo(Promise.resolve(window.claude.use(nome)), ms, 'demorou')
  } catch (e) {
    return null
  }
}

async function comTempoOuNulo(fn, ms) {
  try {
    return await comTempo(Promise.resolve().then(fn), ms, 'demorou')
  } catch (e) {
    return null
  }
}

// Abre o painel de permissões do Claude (botão "Liberar acesso").
export async function abrirPermissoes() {
  if (!dentroDoClaude()) return
  const perm = await usarCapacidade('permissions', 4000)
  if (perm && typeof perm.manage === 'function') {
    try {
      await perm.manage()
    } catch (e) {
      /* painel não abriu: o usuário usa o menu Permissões do artifact */
    }
  }
}

async function backendLocal() {
  // App do iPhone/iPad: arquivos no próprio aparelho (src/plataforma/ios.js)
  if (plataforma.armazenamento) {
    try {
      return await plataforma.armazenamento()
    } catch (e) {
      /* segue para o IndexedDB */
    }
  }
  try {
    const idb = await comTempo(abrirIDB(), 4000, 'IndexedDB demorou demais')
    // teste rápido de leitura
    await tx(idb, 'docs', 'readonly', (s) => s.count())
    return backendNavegador(idb)
  } catch (e) {
    return backendMemoria()
  }
}

const AVISOS = {
  semConta: 'Não consegui usar a sua conta do Claude agora. Os dados estão sendo salvos só neste navegador.',
  negado: 'O Claude está sem permissão para guardar os dados deste app. Os dados estão sendo salvos só neste navegador.',
  escolhido: 'Você abriu sem a conta do Claude. Os dados estão sendo salvos só neste navegador.',
}

// aoEtapa(etapa) avisa a tela de carregamento: 'conta' → 'permissao' (se o Claude for perguntar).
export async function escolherBackend({ forcarLocal = false, aoEtapa = () => {} } = {}) {
  let motivo = null
  if (dentroDoClaude()) {
    if (forcarLocal) {
      motivo = 'escolhido'
    } else {
      aoEtapa('conta')
      const [db, user] = await Promise.all([usarCapacidade('db', 12000), usarCapacidade('user', 12000)])
      const uid = user && typeof user.id === 'function' ? await comTempoOuNulo(() => user.id(), 8000) : null
      if (db && uid) {
        const perm = await usarCapacidade('permissions', 4000)
        let estado = perm && typeof perm.state === 'function' ? await comTempoOuNulo(() => perm.state(), 4000) : null
        estado = estado && typeof estado === 'object' ? estado : {}
        const pedir = ['db', 'user'].filter((n) => estado[n] === 'prompt')
        if (pedir.length && typeof perm.request === 'function') {
          // Um único pedido de permissão; a tela mostra "toque em Permitir" e o botão para abrir sem a conta.
          aoEtapa('permissao')
          try {
            const r = await perm.request(pedir)
            if (r && typeof r === 'object') estado = { ...estado, ...r }
          } catch (e) {
            /* segue: a primeira leitura decide */
          }
        }
        if (estado.db === 'denied' || estado.user === 'denied') motivo = 'negado'
        else return backendConta(db, uid)
      } else {
        motivo = 'semConta'
      }
    }
  }
  const local = await backendLocal()
  if (motivo) {
    local.aviso = AVISOS[motivo]
    local.motivo = motivo
  }
  return local
}
