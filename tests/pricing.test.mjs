// Teste do motor de preço com um exemplo conferido à mão.
// Rode na pasta do projeto:  npm test
import assert from 'node:assert/strict'
import { precificar, avisoFaixaSugestao, precoNoCanal } from '../src/lib/pricing.js'
import { canaisPadrao } from '../src/lib/defaults.js'

const ctx = {
  impressoras: {
    p: { processo: 'fdm', valor: 5500, potenciaW: 120, amortizacao: { modo: 'prazo', meses: 12 }, horasPorDia: 8, diasPorMes: 22, nivelUso: 'medio', falhasPct: 0.05 },
  },
  filamentos: { f: { custoCarretel: 150, pesoCarretelG: 1000 } },
  resinas: {},
  washcures: {},
  insumos: {},
  tarifaKwh: 0.95,
  custoHoraTrabalho: 25,
  impostoPct: 0,
  custosFixosMensais: 0,
  producaoMensalUnidades: 0,
  markupAtacado: 1.5,
  canais: canaisPadrao(),
}

const produto = {
  pecas: [{ processo: 'fdm', impressoraId: 'p', unidadesPorMesa: 1, tempoImpressaoHoras: 2 + 40 / 60, consumos: [{ filamentoId: 'f', gramasMesa: 100 }], purgaGramas: 0, acabamentoPct: 0, reservaFalhasPct: null }],
  insumos: [],
  minutosTrabalho: 15,
  markupVarejo: 2,
  precoFinalVarejo: null,
}

const r = precificar(produto, ctx)
const c = (v) => Math.round(v * 100) / 100
const parte = (chave) => c(r.composicao.find((x) => x.chave === chave).valor)

assert.equal(parte('material'), 15.0, 'filamento')
assert.equal(parte('energia'), 0.3, 'energia')
assert.equal(parte('maquina'), 6.94, 'máquina')
assert.equal(parte('manutencao'), 0.69, 'manutenção')
assert.equal(parte('falhas'), 1.15, 'reserva para falhas')
assert.equal(parte('trabalho'), 6.25, 'trabalho manual')
assert.equal(c(r.total), 30.34, 'custo por peça')
assert.equal(c(r.preco), 60.68, 'preço venda direta')
assert.equal(c(r.lucro), 30.34, 'lucro')

const preco = (id) => c(r.canais.find((x) => x.canal.id === id).preco)
assert.equal(preco('shopee'), 89.17, 'Shopee (faixa R$ 80–99,99)')
assert.equal(preco('mercadolivre'), 75.63, 'Mercado Livre')
assert.equal(preco('infinity3x'), 69.34, 'Cartão 3x')
assert.equal(preco('pix'), 60.68, 'Pix')

const aviso = avisoFaixaSugestao(canaisPadrao()[0], r.canais[0].preco, 0)
assert.equal(aviso.precoAlternativo, 79.99)
assert.equal(c(aviso.liquidoAlternativo), 59.49)

// Com imposto: o canal preserva o líquido da venda direta.
assert.equal(c(precoNoCanal(100, { taxaPct: 0.1, taxaFixa: 5 }, 0.06)), c((100 * 0.94 + 5) / (1 - 0.1 - 0.06)))

console.log('Motor de preço: todos os testes passaram.')
