// Testes da importação de materiais e do financeiro (rode com: npm test)
import assert from 'node:assert/strict'
import { analisarMateriais, documentosParaSalvar, lerNumero, mapearColunas, corDe } from '../src/lib/materiais.js'
import { analisarFinanceiro, intervaloDe } from '../src/lib/financeiro.js'
import { hojeISO, isoDe } from '../src/lib/format.js'

const perto = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} ≠ ${b}`)

// ---------- Números do jeito que vêm do Excel brasileiro ----------
assert.equal(lerNumero('149,90').valor, 149.9)
assert.equal(lerNumero('R$ 1.234,56').valor, 1234.56)
assert.equal(lerNumero('1,234.56').valor, 1234.56)
assert.equal(lerNumero('1.000').valor, 1000)
assert.equal(lerNumero('1.5').valor, 1.5)
assert.deepEqual(lerNumero('1kg'), { valor: 1, unidade: 'kg' })
assert.deepEqual(lerNumero('750 g'), { valor: 750, unidade: 'g' })
assert.equal(lerNumero(109.9).valor, 109.9)
assert.equal(lerNumero(''), null)
assert.equal(lerNumero(null), null)
assert.ok(Number.isNaN(lerNumero('abc').valor))
assert.equal(corDe('preto'), '#1f1f1f')
assert.equal(corDe('#FFF'), '#ffffff')
assert.equal(corDe('PLA Azul Claro', true), '#6fa8dc')

// ---------- Colunas reconhecidas ----------
const tituloModelo = ['Nome', 'Tipo', 'Marca', 'Fornecedor', 'Cor', 'Preço do carretel (R$)', 'Peso do carretel (g)', 'Em estoque (carretéis)', 'Custo por kg (R$)', 'Valor em estoque (R$)', 'Código do app (não altere)']
assert.deepEqual(mapearColunas(tituloModelo, 'filamentos'), ['nome', 'tipo', 'marca', 'fornecedor', 'cor', 'custoCarretel', 'pesoCarretelG', 'estoque', null, null, 'codigo'])
assert.deepEqual(mapearColunas(['Nome', 'Unidade', 'Preço pago (R$)', 'Quantidade no pacote', 'Em estoque', 'Custo por unidade (R$)'], 'insumos'), ['nome', 'unidade', 'precoEmbalagem', 'qtdEmbalagem', 'estoque', null])
assert.deepEqual(mapearColunas(['Descrição', 'Valor', 'Qtd'], 'filamentos'), ['nome', 'custoCarretel', 'estoque'])

// ---------- Importação: novo, atualiza, erro, repetido, exemplo ----------
const dados = {
  filamentos: { f1: { id: 'f1', nome: 'PLA Preto', tipo: 'PLA', cor: '#1f1f1f', custoCarretel: 110, pesoCarretelG: 1000, estoque: 1, criadoEm: 1 } },
  resinas: {},
  insumos: { i1: { id: 'i1', nome: 'Caixa 15x15', unidade: 'un', precoEmbalagem: 45, qtdEmbalagem: 25, estoque: 10, criadoEm: 1 } },
}
const abas = [
  {
    nome: 'Filamentos',
    linhas: [
      ['Meus filamentos'],
      ['Nome', 'Preço', 'Peso', 'Estoque', 'Cor'],
      ['Exemplo: PLA X', 100, 1000, 1, 'preto'],
      ['pla  preto', null, null, '5', null],
      ['PETG Azul', '119,90', '1kg', '2', null],
      ['Sem preço', null, null, 3, null],
      ['PLA Preto', null, null, 9, null],
      ['TPU Vermelho', 'R$ 160,00', '0,5', null, null],
      [null, null, null, null, null],
    ],
  },
  { nome: 'Planilha1', linhas: [['Nome', 'Preço', 'Volume (L)', 'Em estoque'], ['Resina Cinza', 179.9, 1, 2]] },
  { nome: 'Como preencher', linhas: [['Como preencher'], ['Uma linha por material']] },
  { nome: 'Insumos', linhas: [['Código do app (não altere)', 'Nome', 'Em estoque'], ['i1', 'Caixa 15x15', 30], ['zz-nao-existe', '', 5]] },
]
const a = analisarMateriais(abas, dados)
const fil = a.abas[0]
assert.equal(fil.tipo, 'filamentos')
const st = Object.fromEntries(fil.linhas.map((l) => [l.n, l.status]))
assert.deepEqual(st, { 3: 'exemplo', 4: 'atualizar', 5: 'novo', 6: 'erro', 7: 'repetido', 8: 'novo' })
const atualiza = fil.linhas.find((l) => l.n === 4)
assert.deepEqual(atualiza.mudancas.filter((m) => m !== 'nome'), ['estoque'])
assert.equal(atualiza.doc.estoque, 5)
assert.equal(atualiza.doc.custoCarretel, 110, 'campos vazios não mudam')
const petg = fil.linhas.find((l) => l.n === 5).doc
assert.equal(petg.custoCarretel, 119.9)
assert.equal(petg.pesoCarretelG, 1000, '1 kg vira 1000 g')
assert.equal(petg.tipo, 'PETG', 'tipo pelo nome')
assert.equal(petg.cor, '#1e5bb8', 'cor pelo nome')
const tpu = fil.linhas.find((l) => l.n === 8).doc
assert.equal(tpu.pesoCarretelG, 500, '0,5 sem unidade = 0,5 kg')
assert.equal(tpu.estoque, null)
const res = a.abas[1]
assert.equal(res.tipo, 'resinas', 'tipo pelas colunas')
assert.equal(res.linhas[0].doc.volumeFrascoMl, 1000, '1 L vira 1000 ml')
assert.equal(a.abas[2].tipo, null, 'aba de instruções é ignorada')
const ins = a.abas[3]
assert.equal(ins.linhas[0].status, 'atualizar')
assert.equal(ins.linhas[0].doc.id, 'i1')
assert.equal(ins.linhas[0].doc.estoque, 30)
assert.equal(ins.linhas[1].status, 'erro', 'código inexistente sem nome')
assert.deepEqual(a.totais, { novo: 3, atualizar: 2, igual: 0, ignoradas: 4 })
const docs = documentosParaSalvar(a)
assert.equal(docs.filamentos.length, 3)
assert.equal(docs.resinas.length, 1)
assert.equal(docs.insumos.length, 1)

// "Cadastrar outro" quando o nome já existe
const b = analisarMateriais([abas[0]], dados, { quandoNomeExiste: 'novo' })
assert.equal(b.abas[0].linhas.find((l) => l.n === 4).status, 'erro', 'sem preço não dá para cadastrar novo')
// tipo escolhido na tela
const c = analisarMateriais([abas[1]], dados, { tipos: { 0: null } })
assert.equal(c.abas[0].linhas.length, 0)

// ---------- Período ----------
const hoje = hojeISO()
const [y, m] = hoje.split('-').map(Number)
assert.deepEqual(intervaloDe('mes'), { de: isoDe(new Date(y, m - 1, 1)), ate: isoDe(new Date(y, m, 0)) })
assert.deepEqual(intervaloDe('mes-passado'), { de: isoDe(new Date(y, m - 2, 1)), ate: isoDe(new Date(y, m - 1, 0)) })
assert.deepEqual(intervaloDe('datas', '2026-05-10', '2026-05-01'), { de: '2026-05-01', ate: '2026-05-10' })
assert.deepEqual(intervaloDe('tudo'), { de: null, ate: null })

// ---------- Financeiro ----------
const ts = (iso) => new Date(`${iso}T12:00:00`).getTime()
const ped = (n, criado, extra) => ({ id: `p${n}`, numero: n, clienteNome: 'Cliente', criadoEm: ts(criado), etapa: 'confirmado', cancelado: false, recebimentos: [], devolucoes: [], ...extra })
const fin = analisarFinanceiro(
  {
    produtos: {},
    orcamentos: {},
    pedidos: {
      p1: ped(1, '2026-05-03', { itens: [{ nome: 'Vaso', quantidade: 2, precoUnitario: 50, custoUnitario: 20 }], valorEnvio: 10, desconto: 10, total: 100, recebimentos: [{ valor: 60, data: '2026-05-04' }, { valor: 40, data: '2026-06-02' }] }),
      p2: ped(2, '2026-05-20', { itens: [{ nome: 'Kit', quantidade: 1, precoUnitario: 80, custoUnitario: 30 }], valorEnvio: 0, desconto: 0, total: 80, recebimentos: [{ valor: 30, data: '2026-05-21' }] }),
      p3: ped(3, '2026-05-25', { itens: [{ nome: 'Kit', quantidade: 1, precoUnitario: 80, custoUnitario: 30 }], valorEnvio: 0, desconto: 0, total: 80, cancelado: true, recebimentos: [{ valor: 20, data: '2026-05-25' }], devolucoes: [{ valor: 20, data: '2026-05-26' }] }),
      p4: ped(4, '2026-04-28', { itens: [{ nome: 'Vaso', quantidade: 1, precoUnitario: 50 }], valorEnvio: 0, desconto: 0, total: 50, recebimentos: [{ valor: 50, data: '2026-05-02' }] }),
    },
  },
  { impostoPct: 0.1 },
  { de: '2026-05-01', ate: '2026-05-31' },
)
const t = fin.totais
assert.equal(t.pedidos, 2, 'cancelado e pedido de abril não contam nas vendas de maio')
assert.equal(t.cancelados, 1)
perto(t.vendido, 180, 'vendido')
perto(t.recebido, 60 + 30 + 20 + 50, 'recebido no mês (caixa)')
perto(t.devolvido, 20, 'devolvido')
perto(t.liquido, 140, 'líquido')
perto(t.aReceberHoje, 50 + 0, 'a receber hoje') // p1 quitado em junho; p2 deve 50; p4 sem custo mas quitado
// lucro: p1 base 90 → 90 − 9 − 40 = 41; p2 base 80 → 80 − 8 − 30 = 42
perto(t.lucro, 83, 'lucro estimado')
perto(t.margem, 83 / 170, 'margem')
assert.equal(fin.movimentos.length, 5)
assert.equal(fin.itens.length, 2)
perto(fin.itens[0].desconto, 10, 'desconto rateado')

console.log('Planilhas: todos os testes passaram.')
