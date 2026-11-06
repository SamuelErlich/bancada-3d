// Testes do armazenamento em arquivos do app do iPhone/iPad (rode com: npm test)
import assert from 'node:assert/strict'
import { criarBackendArquivos } from '../src/lib/arquivosBackend.js'

// Disco de mentira: guarda em memória e conta as gravações
function discoFalso() {
  const arquivos = new Map()
  let gravacoes = 0
  let falharNaTroca = false
  return {
    arquivos,
    get gravacoes() {
      return gravacoes
    },
    falharNaProximaTroca() {
      falharNaTroca = true
    },
    async ler(c) {
      return arquivos.has(c) ? arquivos.get(c) : null
    },
    async gravar(c, t) {
      gravacoes += 1
      arquivos.set(c, t)
    },
    async apagar(c) {
      if (!arquivos.has(c)) throw new Error('não existe')
      arquivos.delete(c)
    },
    async renomear(de, para) {
      if (falharNaTroca) {
        falharNaTroca = false
        throw new Error('app fechou no meio')
      }
      arquivos.set(para, arquivos.get(de))
      arquivos.delete(de)
    },
  }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms))

// 1) Salva, junta gravações seguidas e lê de volta
const disco = discoFalso()
const b = criarBackendArquivos(disco, { atraso: 20 })
const vazio = await b.carregar()
assert.equal(vazio.config, null)
assert.deepEqual(vazio.colecoes.filamentos, [])
const p1 = b.salvar('filamentos', { id: 'f1', nome: 'PLA Preto', custoCarretel: 110, estoque: NaN })
const p2 = b.salvar('filamentos', { id: 'f2', nome: 'PETG', custoCarretel: 120 })
const p3 = b.salvarConfig({ negocio: { nome: 'Ateliê' } })
await Promise.all([p1, p2, p3])
assert.equal(disco.gravacoes, 2, 'duas mudanças em filamentos viram uma gravação só (+1 da config)')
assert.ok(disco.arquivos.has('dados/filamentos.json'))
assert.ok(!disco.arquivos.has('dados/filamentos.json.tmp'), 'temporário trocado pelo definitivo')
await b.apagar('filamentos', 'f2')
await b.salvarImagem('img1', 'data:image/png;base64,AAA')

const b2 = criarBackendArquivos(disco, { atraso: 20 })
const lido = await b2.carregar()
assert.deepEqual(lido.colecoes.filamentos, [{ id: 'f1', nome: 'PLA Preto', custoCarretel: 110, estoque: null }])
assert.deepEqual(lido.config, { negocio: { nome: 'Ateliê' } })
assert.equal(await b2.lerImagem('img1'), 'data:image/png;base64,AAA')
await b2.apagarImagem('img1')
assert.equal(await b2.lerImagem('img1'), null)

// 2) App fecha no meio da troca: na próxima abertura vale o arquivo temporário
disco.falharNaProximaTroca()
await b2.salvar('clientes', { id: 'c1', nome: 'Maria' }).catch(() => {})
assert.ok(disco.arquivos.has('dados/clientes.json.tmp'))
assert.ok(!disco.arquivos.has('dados/clientes.json'))
const b3 = criarBackendArquivos(disco, { atraso: 20 })
assert.deepEqual((await b3.carregar()).colecoes.clientes, [{ id: 'c1', nome: 'Maria' }])

// 3) Arquivo definitivo corrompido: usa o temporário; os dois ruins: começa vazio sem quebrar
disco.arquivos.set('dados/pedidos.json', '{"p1": {"id": "p1"')
disco.arquivos.set('dados/pedidos.json.tmp', '{"p1": {"id": "p1", "numero": 1}}')
disco.arquivos.set('dados/orcamentos.json', 'lixo')
const b4 = criarBackendArquivos(disco, { atraso: 20 })
const r4 = await b4.carregar()
assert.deepEqual(r4.colecoes.pedidos, [{ id: 'p1', numero: 1 }])
assert.deepEqual(r4.colecoes.orcamentos, [])

// 4) App indo para o fundo: grava na hora, sem esperar o atraso
const b5 = criarBackendArquivos(disco, { atraso: 60000 })
await b5.carregar()
const antes = disco.gravacoes
const pendente = b5.salvar('insumos', { id: 'i1', nome: 'Caixa' })
await b5.descarregarTudo()
await pendente
assert.equal(disco.gravacoes, antes + 1)
assert.ok(disco.arquivos.get('dados/insumos.json').includes('Caixa'))
await espera(5)

console.log('Armazenamento do app: todos os testes passaram.')
