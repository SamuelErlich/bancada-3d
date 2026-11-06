// Armazenamento em arquivos (app do iPhone/iPad): um arquivo JSON por coleção, fotos em arquivos separados.
// Gravação segura: escreve num arquivo temporário e só depois troca pelo definitivo; se o app fechar no meio,
// a leitura usa o temporário. Várias mudanças seguidas viram uma gravação só (atraso curto).
// "fs" é um adaptador simples: ler(caminho) → texto | null, gravar(caminho, texto), apagar(caminho), renomear(de, para).
import { COLECOES } from './storage.js'

function limpar(obj) {
  return JSON.parse(JSON.stringify(obj, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v)))
}

export function criarBackendArquivos(fs, { atraso = 250, descricao = 'Salvo neste aparelho' } = {}) {
  const memoria = Object.fromEntries(COLECOES.map((c) => [c, {}]))
  let config = null
  const caminho = (nome) => `dados/${nome}.json`
  const conteudo = (nome) => JSON.stringify(nome === 'config' ? config : memoria[nome] || {})

  // uma gravação por vez em cada arquivo
  const filas = new Map()
  const emSerie = (chave, fn) => {
    const prox = (filas.get(chave) || Promise.resolve()).catch(() => {}).then(fn)
    filas.set(chave, prox)
    prox
      .finally(() => {
        if (filas.get(chave) === prox) filas.delete(chave)
      })
      .catch(() => {})
    return prox
  }

  async function gravarSeguro(arq, texto) {
    await fs.gravar(`${arq}.tmp`, texto)
    try {
      await fs.apagar(arq)
    } catch (e) {
      /* ainda não existia */
    }
    await fs.renomear(`${arq}.tmp`, arq)
  }

  async function lerSeguro(arq) {
    for (const p of [arq, `${arq}.tmp`]) {
      let t = null
      try {
        t = await fs.ler(p)
      } catch (e) {
        t = null
      }
      if (!t) continue
      try {
        return JSON.parse(t)
      } catch (e) {
        /* arquivo incompleto: tenta o próximo */
      }
    }
    return null
  }

  const pendentes = new Map()
  function descarregar(nome) {
    const p = pendentes.get(nome)
    if (!p) return Promise.resolve()
    pendentes.delete(nome)
    clearTimeout(p.timer)
    const texto = conteudo(nome) // o estado no momento da gravação
    return emSerie(nome, () => gravarSeguro(caminho(nome), texto)).then(p.ok, p.falha)
  }
  function agendar(nome) {
    let p = pendentes.get(nome)
    if (!p) {
      p = {}
      p.promessa = new Promise((ok, falha) => {
        p.ok = ok
        p.falha = falha
      })
      pendentes.set(nome, p)
    }
    clearTimeout(p.timer)
    p.timer = setTimeout(() => descarregar(nome), atraso)
    return p.promessa
  }

  return {
    tipo: 'aparelho',
    descricao,
    async carregar() {
      const colecoes = {}
      for (const c of COLECOES) {
        const obj = await lerSeguro(caminho(c))
        memoria[c] = obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {}
        colecoes[c] = Object.values(memoria[c])
      }
      config = await lerSeguro(caminho('config'))
      return { config, colecoes }
    },
    salvar(col, doc) {
      if (!memoria[col]) memoria[col] = {}
      memoria[col][doc.id] = limpar(doc)
      return agendar(col)
    },
    apagar(col, id) {
      if (memoria[col]) delete memoria[col][id]
      return agendar(col)
    },
    salvarConfig(cfg) {
      config = limpar(cfg)
      return agendar('config')
    },
    async lerImagem(id) {
      try {
        return (await fs.ler(`imagens/${id}.txt`)) || null
      } catch (e) {
        return null
      }
    },
    salvarImagem(id, dataUrl) {
      return emSerie(`img:${id}`, () => fs.gravar(`imagens/${id}.txt`, dataUrl))
    },
    apagarImagem(id) {
      return emSerie(`img:${id}`, () => fs.apagar(`imagens/${id}.txt`).catch(() => {}))
    },
    /** Grava agora o que estiver esperando (o app foi para o fundo). */
    descarregarTudo() {
      return Promise.all([...pendentes.keys()].map(descarregar))
    },
    limiteImagem: 900000,
  }
}
