// Valores de referência, modelos de impressora e dados de exemplo.
import { novoId, hojeISO, addDias } from './format.js'

export const NOME_APP = 'Bancada 3D'

/** Canais de venda de referência (editáveis em Meu negócio). */
export function canaisPadrao() {
  return [
    {
      id: 'shopee',
      nome: 'Shopee',
      curto: 'Shopee',
      taxaPct: 0.2,
      taxaFixa: 4.5,
      faixas: [
        { ate: 8.99, taxaPct: 0.2, adicional: { tipo: 'percentual', pct: 0.5 } },
        { ate: 79.99, taxaPct: 0.2, adicional: { tipo: 'fixo', valor: 4.5 } },
        { ate: 99.99, taxaPct: 0.14, adicional: { tipo: 'fixo', valor: 16 } },
        { ate: 199.99, taxaPct: 0.14, adicional: { tipo: 'fixo', valor: 20 } },
        { ate: 499.99, taxaPct: 0.14, adicional: { tipo: 'fixo', valor: 26 } },
        { ate: null, taxaPct: 0.14, adicional: { tipo: 'fixo', valor: 26 } },
      ],
      revisadoEm: '2026-10',
      ativo: true,
      padrao: true,
    },
    { id: 'mercadolivre', nome: 'Mercado Livre', curto: 'M. Livre', taxaPct: 0.115, taxaFixa: 6.25, faixas: null, revisadoEm: '2026-07', ativo: true, padrao: true },
    { id: 'infinity3x', nome: 'InfinityPay Crédito 3x', curto: 'Cartão 3x', taxaPct: 0.1249, taxaFixa: 0, faixas: null, revisadoEm: '2026-07', ativo: true, padrao: true },
    { id: 'pix', nome: 'Venda direta (Pix)', curto: 'Pix', taxaPct: 0, taxaFixa: 0, faixas: null, revisadoEm: '2026-07', ativo: true, padrao: true },
  ]
}

export function configPadrao() {
  return {
    versao: 1,
    onboarding: false,
    negocio: { nome: '', documento: '', whatsapp: '', email: '', instagram: '', cidade: '', endereco: '', logoId: null, usarLogo: true },
    custos: { tarifaKwh: 0.95, custoHoraTrabalho: 25, impostoPct: 0 },
    precificacao: { markupVarejo: 2, markupAtacado: 1.5 },
    custosFixos: [],
    producaoMensalUnidades: 0,
    canais: canaisPadrao(),
    orcamento: { validadeDias: 7, prazoEntregaDias: 5, descontoPixPercentual: 0, parcelasCartao: 3, observacoes: '' },
    numeracao: { proximoOrcamento: 1, proximoPedido: 1 },
    sku: { prefixo: '' },
    ia: { provedor: 'gemini', modeloGemini: 'gemini-2.5-flash-image', modeloOpenai: 'gpt-image-1' },
    exemplo: false,
  }
}

/** Modelos com valores de referência — o maker confere o valor pago e o consumo. */
export const MODELOS_IMPRESSORA = [
  { id: 'bambu-a1-mini', nome: 'Bambu Lab A1 mini', processo: 'fdm', valor: 2300, potenciaW: 80 },
  { id: 'bambu-a1', nome: 'Bambu Lab A1', processo: 'fdm', valor: 3500, potenciaW: 95 },
  { id: 'bambu-p1s', nome: 'Bambu Lab P1S', processo: 'fdm', valor: 5500, potenciaW: 120 },
  { id: 'bambu-p2s', nome: 'Bambu Lab P2S', processo: 'fdm', valor: 7500, potenciaW: 130 },
  { id: 'bambu-x1c', nome: 'Bambu Lab X1 Carbon', processo: 'fdm', valor: 10000, potenciaW: 130 },
  { id: 'bambu-h2d', nome: 'Bambu Lab H2D', processo: 'fdm', valor: 18000, potenciaW: 220 },
  { id: 'creality-e3v3se', nome: 'Creality Ender-3 V3 SE', processo: 'fdm', valor: 1400, potenciaW: 110 },
  { id: 'creality-e3v3', nome: 'Creality Ender-3 V3', processo: 'fdm', valor: 2200, potenciaW: 120 },
  { id: 'creality-k1c', nome: 'Creality K1C', processo: 'fdm', valor: 3800, potenciaW: 130 },
  { id: 'creality-k1max', nome: 'Creality K1 Max', processo: 'fdm', valor: 5000, potenciaW: 160 },
  { id: 'creality-k2plus', nome: 'Creality K2 Plus', processo: 'fdm', valor: 10000, potenciaW: 220 },
  { id: 'prusa-mk4s', nome: 'Prusa MK4S', processo: 'fdm', valor: 7500, potenciaW: 90 },
  { id: 'prusa-coreone', nome: 'Prusa CORE One', processo: 'fdm', valor: 9500, potenciaW: 110 },
  { id: 'elegoo-n4pro', nome: 'Elegoo Neptune 4 Pro', processo: 'fdm', valor: 2200, potenciaW: 120 },
  { id: 'anycubic-kobra3', nome: 'Anycubic Kobra 3 Combo', processo: 'fdm', valor: 3300, potenciaW: 120 },
  { id: 'elegoo-mars5u', nome: 'Elegoo Mars 5 Ultra', processo: 'resina', valor: 2200, potenciaW: 60 },
  { id: 'elegoo-saturn4u', nome: 'Elegoo Saturn 4 Ultra', processo: 'resina', valor: 3600, potenciaW: 100 },
  { id: 'anycubic-m7pro', nome: 'Anycubic Photon Mono M7 Pro', processo: 'resina', valor: 3000, potenciaW: 110 },
  { id: 'creality-halot-mage', nome: 'Creality HALOT-MAGE S', processo: 'resina', valor: 2600, potenciaW: 120 },
]

export const MODELOS_LAVAGEM_CURA = [
  { id: 'anycubic-wc3', nome: 'Anycubic Wash & Cure 3', valor: 1100, potenciaW: 60 },
  { id: 'elegoo-mercury', nome: 'Elegoo Mercury Plus 3.0', valor: 900, potenciaW: 48 },
]

export const TIPOS_FILAMENTO = [
  { tipo: 'PLA', preco: 110 },
  { tipo: 'PLA+', preco: 120 },
  { tipo: 'PLA Silk', preco: 140 },
  { tipo: 'PLA Matte', preco: 125 },
  { tipo: 'PETG', preco: 120 },
  { tipo: 'ABS', preco: 115 },
  { tipo: 'ASA', preco: 145 },
  { tipo: 'TPU', preco: 160 },
  { tipo: 'Nylon', preco: 220 },
  { tipo: 'PC', preco: 230 },
  { tipo: 'PLA-CF', preco: 200 },
  { tipo: 'PETG-CF', preco: 210 },
  { tipo: 'Outro', preco: 0 },
]

export const TIPOS_RESINA = ['Standard', 'ABS-like', 'Lavável em água', 'Flexível', 'Alta precisão (8K)', 'Translúcida', 'Outra']

export const UNIDADES_INSUMO = [
  { valor: 'un', rotulo: 'unidade' },
  { valor: 'par', rotulo: 'par' },
  { valor: 'm', rotulo: 'metro' },
  { valor: 'cm', rotulo: 'centímetro' },
  { valor: 'g', rotulo: 'grama' },
  { valor: 'ml', rotulo: 'mililitro' },
  { valor: 'folha', rotulo: 'folha' },
  { valor: 'kit', rotulo: 'kit' },
]

export const SUGESTOES_INSUMO = [
  { nome: 'Caixa de papelão 15×15×10', unidade: 'un', precoEmbalagem: 45, qtdEmbalagem: 25 },
  { nome: 'Plástico bolha', unidade: 'm', precoEmbalagem: 25, qtdEmbalagem: 10 },
  { nome: 'Saco zip 10×15', unidade: 'un', precoEmbalagem: 20, qtdEmbalagem: 100 },
  { nome: 'Ímã de neodímio 10×2 mm', unidade: 'un', precoEmbalagem: 30, qtdEmbalagem: 50 },
  { nome: 'Inserto rosqueado M3', unidade: 'un', precoEmbalagem: 35, qtdEmbalagem: 100 },
  { nome: 'Parafuso M3×10', unidade: 'un', precoEmbalagem: 18, qtdEmbalagem: 100 },
  { nome: 'Argola de chaveiro', unidade: 'un', precoEmbalagem: 22, qtdEmbalagem: 100 },
  { nome: 'Cartão de agradecimento', unidade: 'un', precoEmbalagem: 40, qtdEmbalagem: 100 },
  { nome: 'Álcool isopropílico', unidade: 'ml', precoEmbalagem: 45, qtdEmbalagem: 1000 },
  { nome: 'Tinta acrílica', unidade: 'ml', precoEmbalagem: 18, qtdEmbalagem: 37 },
  { nome: 'Lixa d’água', unidade: 'folha', precoEmbalagem: 3, qtdEmbalagem: 1 },
]

export const MEIOS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Boleto', 'Outro']

export const ETAPAS = [
  { valor: 'confirmado', rotulo: 'Confirmado' },
  { valor: 'em_preparo', rotulo: 'Em preparo' },
  { valor: 'pronto', rotulo: 'Pronto' },
  { valor: 'entregue', rotulo: 'Entregue' },
]

export const CENAS_IA = [
  { id: 'madeira', rotulo: 'Mesa de madeira clara com luz natural', prompt: 'on a light wooden table near a window with soft natural daylight, blurred cozy room in the background' },
  { id: 'estante', rotulo: 'Estante de sala com plantas', prompt: 'on a living room shelf with a few green plants and books, warm afternoon light' },
  { id: 'escritorio', rotulo: 'Escrivaninha de home office', prompt: 'on a tidy home office desk with a laptop and a notebook slightly out of focus, bright neutral light' },
  { id: 'cabeceira', rotulo: 'Cabeceira com luz quente', prompt: 'on a wooden bedside table in a bedroom with neutral tones, warm lamp light in the evening' },
  { id: 'estudio', rotulo: 'Fundo infinito branco de estúdio', prompt: 'on a seamless white studio background with soft even lighting and a gentle shadow under the product' },
  { id: 'infantil', rotulo: 'Quarto infantil colorido', prompt: 'in a colorful kids bedroom on a low shelf, playful pastel colors, soft daylight' },
  { id: 'oficina', rotulo: 'Bancada de oficina maker', prompt: 'on a clean maker workbench with a few tools neatly arranged in the background, crisp lighting' },
  { id: 'loja', rotulo: 'Prateleira de loja', prompt: 'displayed on a modern boutique store shelf, spotlight from above, shallow depth of field' },
]

/** Dados de exemplo — todos marcados com exemplo: true para poderem ser apagados de uma vez. */
export function dadosExemplo() {
  const hoje = hojeISO()
  const agora = Date.now()
  const ex = { exemplo: true }
  const imp = {
    a1: { id: 'ex-a1', nome: 'Bambu Lab A1', modelo: 'bambu-a1', processo: 'fdm', valor: 3500, potenciaW: 95, amortizacao: { modo: 'prazo', meses: 12, horas: 2000 }, horasPorDia: 8, diasPorMes: 22, nivelUso: 'medio', falhasPct: 0.05, ...ex },
    sat: { id: 'ex-saturn', nome: 'Elegoo Saturn 4 Ultra', modelo: 'elegoo-saturn4u', processo: 'resina', valor: 3600, potenciaW: 100, amortizacao: { modo: 'prazo', meses: 18, horas: 2000 }, horasPorDia: 6, diasPorMes: 22, nivelUso: 'medio', falhasPct: 0.08, lcd: { preco: 400, vidaHoras: 2000 }, fep: { preco: 60, vidaImpressoes: 40 }, ...ex },
  }
  const wc = { id: 'ex-wc', nome: 'Anycubic Wash & Cure 3', valor: 1100, potenciaW: 60, amortizacao: { modo: 'prazo', meses: 24, horas: 2000 }, horasPorDia: 2, diasPorMes: 22, ...ex }
  const fil = {
    preto: { id: 'ex-pla-preto', nome: 'PLA Preto', tipo: 'PLA', marca: 'Exemplo', cor: '#1f1f1f', fornecedor: '', custoCarretel: 110, pesoCarretelG: 1000, estoque: 3, ...ex },
    branco: { id: 'ex-pla-branco', nome: 'PLA Branco', tipo: 'PLA', marca: 'Exemplo', cor: '#f4f4f0', fornecedor: '', custoCarretel: 110, pesoCarretelG: 1000, estoque: 2, ...ex },
    petg: { id: 'ex-petg-cinza', nome: 'PETG Cinza', tipo: 'PETG', marca: 'Exemplo', cor: '#8a9196', fornecedor: '', custoCarretel: 120, pesoCarretelG: 1000, estoque: 1.5, ...ex },
    silk: { id: 'ex-silk-dourado', nome: 'PLA Silk Dourado', tipo: 'PLA Silk', marca: 'Exemplo', cor: '#c9a227', fornecedor: '', custoCarretel: 140, pesoCarretelG: 1000, estoque: 1, ...ex },
  }
  const resina = { id: 'ex-resina-cinza', nome: 'Resina Standard Cinza', tipo: 'Standard', marca: 'Exemplo', cor: '#9aa0a4', fornecedor: '', custoFrasco: 180, volumeFrascoMl: 1000, estoque: 2, ...ex }
  const ins = {
    caixa: { id: 'ex-caixa', nome: 'Caixa de papelão 15×15×10', unidade: 'un', precoEmbalagem: 45, qtdEmbalagem: 25, estoque: 40, ...ex },
    bolha: { id: 'ex-bolha', nome: 'Plástico bolha', unidade: 'm', precoEmbalagem: 25, qtdEmbalagem: 10, estoque: 15, ...ex },
    zip: { id: 'ex-zip', nome: 'Saco zip 10×15', unidade: 'un', precoEmbalagem: 20, qtdEmbalagem: 100, estoque: 300, ...ex },
    ima: { id: 'ex-ima', nome: 'Ímã de neodímio 10×2 mm', unidade: 'un', precoEmbalagem: 30, qtdEmbalagem: 50, estoque: 120, ...ex },
    argola: { id: 'ex-argola', nome: 'Argola de chaveiro', unidade: 'un', precoEmbalagem: 22, qtdEmbalagem: 100, estoque: 200, ...ex },
    cartao: { id: 'ex-cartao', nome: 'Cartão de agradecimento', unidade: 'un', precoEmbalagem: 40, qtdEmbalagem: 100, estoque: 150, ...ex },
    alcool: { id: 'ex-alcool', nome: 'Álcool isopropílico', unidade: 'ml', precoEmbalagem: 45, qtdEmbalagem: 1000, estoque: 1500, ...ex },
  }
  const pecaFdm = (id, nome, impressoraId, consumos, horas, un = 1, extra = {}) => ({
    id,
    nome,
    processo: 'fdm',
    impressoraId,
    unidadesPorMesa: un,
    tempoImpressaoHoras: horas,
    consumos,
    purgaGramas: 0,
    acabamentoPct: 0,
    reservaFalhasPct: null,
    ...extra,
  })
  const produtos = [
    {
      id: 'ex-vaso', nome: 'Vaso espiral', descricao: 'Vaso decorativo com parede torcida, 18 cm de altura.',
      pecas: [pecaFdm('p1', 'Vaso', imp.a1.id, [{ filamentoId: fil.branco.id, gramasMesa: 118 }], 4.2)],
      insumos: [{ insumoId: ins.caixa.id, quantidade: 1 }, { insumoId: ins.bolha.id, quantidade: 0.5 }, { insumoId: ins.cartao.id, quantidade: 1 }],
      minutosTrabalho: 10, incluirFixos: true, markupVarejo: 2.2, precoFinalVarejo: null, noCatalogo: true, sku: 'EX-VAS-001', fotoId: null,
    },
    {
      id: 'ex-headset', nome: 'Suporte de headset', descricao: 'Suporte de mesa com base pesada e gancho emborrachado.',
      pecas: [pecaFdm('p1', 'Suporte', imp.a1.id, [{ filamentoId: fil.preto.id, gramasMesa: 165 }], 5.5)],
      insumos: [{ insumoId: ins.caixa.id, quantidade: 1 }, { insumoId: ins.cartao.id, quantidade: 1 }],
      minutosTrabalho: 15, incluirFixos: true, markupVarejo: 2, precoFinalVarejo: null, noCatalogo: true, sku: 'EX-SUP-002', fotoId: null,
    },
    {
      id: 'ex-organizador', nome: 'Kit organizador de gaveta', descricao: 'Bandeja com 4 divisórias de encaixe.',
      pecas: [
        pecaFdm('p1', 'Bandeja', imp.a1.id, [{ filamentoId: fil.petg.id, gramasMesa: 92 }], 3.1),
        pecaFdm('p2', 'Divisórias', imp.a1.id, [{ filamentoId: fil.petg.id, gramasMesa: 64 }], 2.4, 1),
      ],
      insumos: [{ insumoId: ins.zip.id, quantidade: 1 }, { insumoId: ins.caixa.id, quantidade: 1 }],
      minutosTrabalho: 12, incluirFixos: true, markupVarejo: 2, precoFinalVarejo: 79.9, noCatalogo: true, sku: 'EX-KIT-003', fotoId: null,
    },
    {
      id: 'ex-dragao', nome: 'Miniatura de dragão', descricao: 'Miniatura de 6 cm em resina, sem pintura.',
      pecas: [{ id: 'p1', nome: 'Dragão', processo: 'resina', impressoraId: imp.sat.id, unidadesPorMesa: 4, tempoImpressaoHoras: 3.5, resinaId: resina.id, volumeMl: 88, perdasPct: 0.05, tempoLavagemMin: 6, tempoCuraMin: 4, washCureId: wc.id, reservaFalhasPct: null }],
      insumos: [{ insumoId: ins.alcool.id, quantidade: 15 }, { insumoId: ins.zip.id, quantidade: 1 }],
      minutosTrabalho: 12, incluirFixos: true, markupVarejo: 3, precoFinalVarejo: null, noCatalogo: true, sku: 'EX-MIN-004', fotoId: null,
    },
    {
      id: 'ex-chaveiro', nome: 'Chaveiro com nome (2 cores)', descricao: 'Chaveiro personalizado impresso com troca de cor no AMS.',
      pecas: [pecaFdm('p1', 'Chaveiro', imp.a1.id, [{ filamentoId: fil.branco.id, gramasMesa: 54 }, { filamentoId: fil.preto.id, gramasMesa: 22 }], 2.8, 12, { purgaGramas: 30 })],
      insumos: [{ insumoId: ins.argola.id, quantidade: 1 }, { insumoId: ins.zip.id, quantidade: 1 }],
      minutosTrabalho: 3, incluirFixos: true, markupVarejo: 3, precoFinalVarejo: null, noCatalogo: false, sku: '', fotoId: null,
    },
  ].map((p, i) => ({ ...p, criadoEm: agora - (5 - i) * 86400000, atualizadoEm: agora - (5 - i) * 86400000, ...ex }))

  const clientes = [
    { id: 'ex-cli-1', nome: 'Juliana Prado', whatsapp: '(11) 90000-0001', email: 'juliana@exemplo.com', observacao: 'Prefere retirar no fim da tarde.', arquivado: false },
    { id: 'ex-cli-2', nome: 'Diego Matos', whatsapp: '(11) 90000-0002', email: '', observacao: 'Pediu preço para 10 unidades.', arquivado: false },
    { id: 'ex-cli-3', nome: 'Fernanda Lopes', whatsapp: '(19) 90000-0003', email: '', observacao: '', arquivado: false },
    { id: 'ex-cli-4', nome: 'Otávio Reis', whatsapp: '(21) 90000-0004', email: 'otavio@exemplo.com', observacao: '', arquivado: false },
  ].map((c, i) => ({ ...c, criadoEm: agora - (10 - i) * 86400000, ...ex }))

  const item = (p, q, preco) => ({ produtoId: p.id, nome: p.nome, sku: p.sku, quantidade: q, precoUnitario: preco, fotoId: null })
  const vaso = produtos[0]
  const headset = produtos[1]
  const kit = produtos[2]
  const dragao = produtos[3]
  const orcamentos = [
    {
      id: 'ex-orc-1', numero: 1, clienteId: clientes[0].id, clienteNome: clientes[0].nome, clienteContato: clientes[0].whatsapp,
      itens: [item(vaso, 2, 67.08), item(kit, 1, 79.9)], valorEnvio: 0, validadeDias: 7, prazoEntregaDias: 5, descontoPixPercentual: 5, parcelasCartao: 3,
      observacoes: 'Cores sob encomenda: confirmar antes de imprimir.', status: 'aprovado', pedidoId: 'ex-ped-1', emitidoEm: addDias(hoje, -4), criadoEm: agora - 4 * 86400000,
    },
    {
      id: 'ex-orc-2', numero: 2, clienteId: clientes[1].id, clienteNome: clientes[1].nome, clienteContato: clientes[1].whatsapp,
      itens: [item(headset, 10, 62.9)], valorEnvio: 35, validadeDias: 7, prazoEntregaDias: 8, descontoPixPercentual: 5, parcelasCartao: 3,
      observacoes: 'Preço especial para 10 unidades (presentes de fim de ano da empresa).', status: 'emitido', pedidoId: null, emitidoEm: addDias(hoje, -1), criadoEm: agora - 86400000,
    },
  ].map((o) => ({ ...o, ...ex }))

  const totalItens = (itens) => itens.reduce((s, it) => s + it.quantidade * it.precoUnitario, 0)
  const hist = (tipo, extra = {}) => ({ id: novoId(), tipo, em: agora - 86400000 * (extra.dias || 0), ...extra })
  const ped1Itens = orcamentos[0].itens
  const ped2Itens = [item(dragao, 3, 40.55)]
  const ped3Itens = [item(headset, 1, 78.73), item(vaso, 1, 67.08)]
  const pedidos = [
    {
      id: 'ex-ped-1', numero: 1, origem: 'orcamento', orcamentoId: 'ex-orc-1', clienteId: clientes[0].id, clienteNome: clientes[0].nome,
      itens: ped1Itens, valorEnvio: 0, desconto: 0, total: totalItens(ped1Itens), prazo: addDias(hoje, 3), etapa: 'em_preparo', cancelado: false,
      recebimentos: [{ id: novoId(), valor: 107.03, data: addDias(hoje, -3), meio: 'Pix', obs: 'Sinal de 50%' }], devolucoes: [], observacoes: '',
      historico: [hist('criado', { dias: 3 }), hist('recebimento', { dias: 3, valor: 107.03, meio: 'Pix' }), hist('etapa', { dias: 1, de: 'confirmado', para: 'em_preparo' })],
      criadoEm: agora - 3 * 86400000,
    },
    {
      id: 'ex-ped-2', numero: 2, origem: 'catalogo', orcamentoId: null, clienteId: clientes[2].id, clienteNome: clientes[2].nome,
      itens: ped2Itens, valorEnvio: 18, desconto: 5, total: totalItens(ped2Itens) + 18 - 5, prazo: addDias(hoje, -1), etapa: 'confirmado', cancelado: false,
      recebimentos: [], devolucoes: [], observacoes: 'Enviar pelos Correios.',
      historico: [hist('criado', { dias: 5 })],
      criadoEm: agora - 5 * 86400000,
    },
    {
      id: 'ex-ped-3', numero: 3, origem: 'catalogo', orcamentoId: null, clienteId: clientes[3].id, clienteNome: clientes[3].nome,
      itens: ped3Itens, valorEnvio: 0, desconto: 0, total: totalItens(ped3Itens), prazo: addDias(hoje, -6), etapa: 'entregue', cancelado: false,
      recebimentos: [{ id: novoId(), valor: totalItens(ped3Itens), data: addDias(hoje, -6), meio: 'Cartão de crédito', obs: '' }], devolucoes: [], observacoes: '',
      historico: [hist('criado', { dias: 9 }), hist('etapa', { dias: 8, de: 'confirmado', para: 'em_preparo' }), hist('etapa', { dias: 7, de: 'em_preparo', para: 'pronto' }), hist('etapa', { dias: 6, de: 'pronto', para: 'entregue' }), hist('recebimento', { dias: 6, valor: totalItens(ped3Itens), meio: 'Cartão de crédito' })],
      criadoEm: agora - 9 * 86400000,
    },
  ].map((p) => ({ ...p, ...ex }))

  const config = {
    custos: { tarifaKwh: 0.95, custoHoraTrabalho: 25, impostoPct: 0 },
    custosFixos: [
      { id: 'ex-fx-1', nome: 'Internet (parte usada no negócio)', valorMensal: 50 },
      { id: 'ex-fx-2', nome: 'DAS do MEI', valorMensal: 82 },
      { id: 'ex-fx-3', nome: 'Assinatura de modelos 3D', valorMensal: 30 },
    ],
    producaoMensalUnidades: 200,
    numeracao: { proximoOrcamento: 3, proximoPedido: 4 },
    negocio: { nome: 'Ateliê Exemplo 3D', documento: '', whatsapp: '', email: '', instagram: '@atelieexemplo3d', cidade: '', endereco: '', logoId: null, usarLogo: true },
    exemplo: true,
  }

  return {
    config,
    impressoras: [imp.a1, imp.sat],
    washcures: [wc],
    filamentos: Object.values(fil),
    resinas: [resina],
    insumos: Object.values(ins),
    produtos,
    clientes,
    orcamentos,
    pedidos,
  }
}
