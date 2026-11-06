const TOPICOS = [
  {
    titulo: 'Começando',
    itens: [
      {
        p: 'O que preciso cadastrar antes de calcular?',
        r: [
          'Em Meu negócio, a tarifa de energia (o valor do kWh na conta de luz) e quanto vale a sua hora.',
          'Em Meu QG, pelo menos uma impressora (valor pago e consumo médio) e um material (filamento ou resina, com o preço que você paga).',
          'Embalagens e materiais extras entram em Meu QG → Insumos.',
        ],
      },
      {
        p: 'Minha impressora não está na lista.',
        r: ['Escolha “Outra impressora (digitar)” e preencha o seu modelo. Os valores sugeridos para os modelos da lista são só referência: confira o valor pago e o consumo médio.'],
      },
      {
        p: 'Mudei o preço do filamento. O que acontece?',
        r: [
          'Edite o cadastro em Meu QG. Todos os cálculos que usam esse material passam a usar o preço novo, com o mesmo markup (a margem é preservada).',
          'Se um produto tem preço de venda definido à mão, ele não muda: revise esse preço.',
          'Orçamentos e pedidos já registrados guardam os valores combinados e não mudam.',
        ],
      },
    ],
  },
  {
    titulo: 'Cálculo e preço',
    itens: [
      {
        p: 'De onde tiro o peso e o tempo?',
        r: [
          'Do fatiador (Bambu Studio, OrcaSlicer, PrusaSlicer, Cura, Chitubox…). Use os números da mesa inteira, com suportes, e informe quantas unidades saem juntas: o app divide os custos entre elas.',
          'Para um produto feito de partes diferentes, use “Adicionar peça”.',
        ],
      },
      {
        p: 'Imprimo multicolor (AMS/MMU). Como lanço?',
        r: ['Adicione cada filamento com as gramas dele e informe a purga (material descartado nas trocas de cor) no campo próprio. Confira se o peso que você copiou já não inclui a purga, para não contar duas vezes.'],
      },
      {
        p: 'Como são calculados energia, máquina e manutenção?',
        r: [
          'Energia: consumo médio (kW) × horas de impressão × tarifa.',
          'Máquina: valor da impressora ÷ horas em que ela precisa se pagar (prazo em meses × horas por dia × dias por mês, ou a vida útil em horas) × horas de impressão.',
          'Manutenção: uma reserva anual de 5% a 25% do valor da máquina (FDM) ou 4% a 16% (resina), conforme o nível de uso, dividida pelas horas de uso do ano.',
          'Na resina também entram a tela LCD (preço ÷ vida útil em horas), o filme FEP (preço ÷ impressões que ele aguenta) e a estação de lavagem e cura.',
        ],
      },
      {
        p: 'O que é a reserva para falhas?',
        r: ['Um acréscimo sobre material, purga, energia, máquina e manutenção para cobrir impressões perdidas. Cada impressora tem um padrão e você pode ajustar em uma peça específica.'],
      },
      {
        p: 'Markup ou margem?',
        r: [
          'O markup multiplica o custo: 2× sobre R$ 10 dá R$ 20. Isso não é 100% de margem.',
          'A margem é o lucro dividido pelo preço, depois do imposto. O painel mostra os dois. Se preferir, digite o preço final e veja o lucro que sobra.',
        ],
      },
      {
        p: 'Por que o preço no marketplace é maior?',
        r: [
          'O preço por canal cobre a comissão, a taxa fixa por unidade e o imposto, para sobrar o mesmo lucro da venda direta.',
          'Na Shopee a taxa muda por faixa de preço. Quando a sugestão cai numa faixa mais cara, o app avisa quanto sobraria vendendo no topo da faixa anterior.',
          'As taxas são referências editáveis em Meu negócio → Canais de venda. Elas não são sincronizadas com as plataformas.',
        ],
      },
    ],
  },
  {
    titulo: 'Catálogo e SKU',
    itens: [
      { p: 'Cálculo salvo × catálogo', r: ['Todo cálculo salvo fica em Cálculos. Os que você vende com frequência você promove ao catálogo (a estrela), onde ganham foto, descrição e SKU.'] },
      {
        p: 'Como gerar o SKU?',
        r: ['Abra o produto no catálogo, use “Gerar SKU” (ou digite o seu), clique em “Revisar SKU” e depois em “Confirmar e salvar”. O código não muda se você renomear o produto ou recalcular o preço. SKU não é código de barras.'],
      },
      { p: 'Exportar vários cálculos', r: ['Em Cálculos ou no Catálogo, clique em Selecionar, marque os itens e exporte em PDF (ficha de custo, uso interno) ou Excel. São até 500 itens por vez.'] },
    ],
  },
  {
    titulo: 'Orçamentos',
    itens: [
      {
        p: 'Como enviar um orçamento em PDF?',
        r: ['Em Orçamentos → Novo orçamento, escolha o cliente e os produtos e confira quantidades, preços, envio e condições. Depois de gerar, use “Compartilhar ou salvar PDF”. No celular abre o compartilhamento; no computador, o arquivo é baixado.'],
      },
      { p: 'Já tenho uma numeração própria', r: ['Em Orçamentos → Numeração, informe o próximo número. Se o último foi 100, use 101. A sequência só avança e não altera os documentos anteriores.'] },
      { p: 'Minha logo no orçamento', r: ['Envie a logo em Meu negócio e marque “Usar a logo nos orçamentos”.'] },
    ],
  },
  {
    titulo: 'Pedidos e clientes',
    itens: [
      {
        p: 'O cliente aprovou. E agora?',
        r: ['No orçamento, clique em “Cliente aprovou: criar pedido”. Os preços vêm do orçamento, sem recalcular. Confira envio, desconto e prazo, marque a confirmação e clique em Confirmar pedido. Cada orçamento vira um único pedido.'],
      },
      { p: 'Venda sem orçamento', r: ['Em Pedidos → Novo pedido, escolha “Do catálogo”, adicione os produtos e ajuste os preços combinados.'] },
      {
        p: 'Etapas e correções',
        r: ['O pedido anda em Confirmado → Em preparo → Pronto → Entregue. Errou? Use “Corrigir etapa” ou, se já entregou, “Reabrir pedido”, com o motivo. Etapa e pagamento são separados: entregar não registra recebimento.'],
      },
      { p: 'Sinal e pagamento', r: ['Use “Registrar recebimento” com valor, data e meio. Dá para lançar um sinal e o restante depois; o saldo a receber se atualiza. Nada é cobrado automaticamente.'] },
      { p: 'Cancelamento e devolução', r: ['Cancelar guarda itens, valores e histórico, mas não devolve dinheiro. Se devolver algo ao cliente, faça fora do app e use “Registrar devolução”.'] },
      { p: 'Aviso pelo WhatsApp', r: ['No pedido, clique em “Avisar cliente pelo WhatsApp”, confira número e mensagem da etapa e abra o WhatsApp. O envio é manual: mudar a etapa não manda nada sozinho.'] },
      { p: 'Arquivar cliente', r: ['Arquivar tira o cliente da lista de novos pedidos, mas o histórico fica. Dá para reativar depois.'] },
    ],
  },
  {
    titulo: 'Imagens com IA',
    itens: [
      {
        p: 'Como criar a foto do produto em outro ambiente?',
        r: [
          'Fotografe a peça inteira, com boa luz e fundo liso. Em Imagens com IA, envie a foto (ou use a de um produto), descreva o produto em poucas palavras e escolha a cena.',
          'Informe a sua chave do Google AI Studio (Gemini) ou da OpenAI. Ela fica só neste navegador. O custo de cada imagem é cobrado na sua conta do provedor.',
          'Clique em “Revisar antes de gerar” e confirme. Compare o resultado com a foto original antes de usar em anúncios.',
        ],
      },
      { p: 'Usar a imagem no catálogo', r: ['No resultado ou em Minhas imagens, use “Associar a um produto”. A foto anterior é substituída; custo e preço não mudam.'] },
    ],
  },
  {
    titulo: 'Planilhas (Excel)',
    itens: [
      {
        p: 'Como cadastro vários filamentos de uma vez?',
        r: [
          'Em Planilhas (ou Meu QG → Importar planilha), baixe a tabela modelo.',
          'No Excel, preencha uma linha por material (pode colar da sua planilha, mantendo os títulos das colunas). Nome e preço bastam.',
          'Volte ao app, clique em Importar planilha e escolha o arquivo. O app mostra o que é novo, o que atualiza e o que tem erro. Confira e clique em Importar.',
        ],
      },
      {
        p: 'Como atualizo só o estoque pelo Excel?',
        r: [
          'Em Planilhas, clique em Exportar materiais e estoque.',
          'No Excel, mude a coluna “Em estoque” (pode apagar as outras colunas, menos Nome ou Código).',
          'Importe o arquivo de volta: o app reconhece cada material pelo nome ou pelo código e muda só o que estiver preenchido.',
        ],
      },
      {
        p: 'O que vem na planilha financeira?',
        r: [
          'Escolha o período em Planilhas → Financeiro e baixe o .xlsx.',
          'Abas: Resumo (com totais por mês), Movimentações (cada entrada e devolução pela data do pagamento), Pedidos, Itens vendidos, A receber, Cancelados, Orçamentos e Custos fixos.',
          'Valores saem como moeda e datas de verdade, com filtro nos títulos: dá para somar, filtrar e fazer tabela dinâmica. Os totais respeitam o filtro.',
          'Custo e lucro são estimativas: usam o custo do produto no momento da venda (pedidos antigos usam o cálculo atual).',
        ],
      },
    ],
  },
  {
    titulo: 'Conta e dados',
    itens: [
      {
        p: 'Onde ficam meus dados?',
        r: [
          'Aberto dentro do Claude: no seu espaço privado, ligado à sua conta.',
          'Publicado no seu domínio ou aberto no computador: no navegador (IndexedDB) daquele aparelho.',
          'No app do iPhone/iPad: no próprio aparelho, dentro do app (entra no backup do iCloud).',
          'Em Minha conta você exporta um backup completo (.json) e restaura em outro aparelho ou navegador.',
        ],
      },
      { p: 'Modo escuro', r: ['Em Minha conta → Aparência: Claro, Escuro ou Sistema.'] },
    ],
  },
]

export default function Ajuda() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Central de ajuda</span>
          <h1>Como usar</h1>
          <p>Escolha um assunto e abra a pergunta para ver o passo a passo.</p>
        </div>
      </div>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {TOPICOS.map((t) => (
          <section key={t.titulo} className="card faq">
            <h3>{t.titulo}</h3>
            {t.itens.map((i) => (
              <details key={i.p}>
                <summary>{i.p}</summary>
                <div>
                  {i.r.map((x, k) => (
                    <p key={k}>{x}</p>
                  ))}
                </div>
              </details>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
