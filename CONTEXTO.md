# Prompt de contexto para continuar em outra conversa

Copie tudo abaixo e cole no início da nova conversa, junto com o zip do projeto.

---

Estou continuando o projeto **Bancada 3D**: um app em React (Vite + React 18 embutido no build, JS sem TypeScript) que replica as funções do QG Maker (qgmaker.com.br), com marca própria. O zip do projeto está anexado. O app está publicado como artifact no Claude (https://claude.ai/artifact/BkJdZcJkBggXVg9kJJtMRQ).

O que já existe e funciona (testado ponta a ponta, sem erros):
- Meu QG: impressoras FDM/resina com valor, consumo (W), amortização por prazo em meses ou vida útil em horas, uso por dia, dias por mês, nível de uso (manutenção anual FDM 5/10/15/25%, resina 4/8/12/16%), reserva para falhas, LCD e FEP; estação de lavagem e cura (5%/ano); filamentos (preço/peso do carretel); resinas (preço/volume do frasco); insumos (preço do pacote ÷ quantidade).
- Cálculos: várias peças por produto, multicor com purga, unidades na mesa, acabamento %, reserva por peça, insumos, trabalho manual, custos fixos rateados, markup (slider 1–5×) ou preço manual, preço atacado, preço por canal mantendo o lucro da venda direta (Shopee com 6 faixas out/2026, Mercado Livre 11,5% + R$ 6,25, InfinityPay 3x 12,49%, Pix), aviso de faixa, simulador de desconto, PDF e Excel (seleção múltipla, até 500).
- O motor (src/lib/pricing.js) bate 100% com o original: exemplo 100 g / 2h40 / impressora R$ 5.500 120 W / carretel R$ 150 → custo R$ 30,34, preço R$ 60,68, Shopee R$ 89,17, ML R$ 75,63, cartão R$ 69,34. `npm test` confere.
- Catálogo com foto, descrição, SKU (gerar → revisar → confirmar), orçar.
- Orçamentos: cliente, itens, tabela varejo/atacado, envio, validade, prazo em dias úteis, desconto Pix %, parcelas, observações, condições padrão, numeração que só avança, PDF com logo (jsPDF via cdnjs), WhatsApp, duplicar, recusar, virar pedido.
- Pedidos: de orçamento ou do catálogo, cliente obrigatório (cadastro rápido no formulário), envio, desconto, prazo, confirmação de revisão, etapas Confirmado → Em preparo → Pronto → Entregue, corrigir etapa e reabrir com motivo, cancelar (sem estorno), reativar, recebimentos e devoluções, saldo, atrasados, aviso por WhatsApp com mensagem por etapa, histórico, numeração própria.
- Clientes: cadastro, observação interna, histórico, arquivar/reativar, planilha de clientes e pedidos.
- Imagens com IA: Gemini (gemini-2.5-flash-image) ou OpenAI (gpt-image-1) com a chave do usuário salva só no navegador; Minhas imagens; associar ao catálogo. Desligado dentro do Claude (CSP).
- Meu negócio, Minha conta (aparência, backup .json, restaurar, apagar exemplos, apagar tudo, instalar como app), Ajuda, assistente inicial e dados de exemplo removíveis.
- Armazenamento: dentro do Claude usa o banco privado da conta (capacidades db + user, caminho data/users/<id>/app/<coleção>/<id>); fora dele, IndexedDB; sem nada, memória.
- Abertura à prova de travamento (corrigido depois de "não consegui abrir"): React embutido (sem CDN); tela "Abrindo…" já no HTML e aviso com o motivo se o app não carregar (nunca tela branca); tempo-limite em claude.use (12 s) e user.id (8 s); se o Claude for pedir permissão, a tela avisa "toque em Permitir" (permissions.request uma vez); depois de 6 s aparece "Abrir agora usando este navegador"; se a conta falhar, tela com "Tentar de novo" e "Abrir usando este navegador"; sem conta/negado, abre no navegador com faixa de aviso ("Tentar a conta de novo" / "Liberar acesso"); Protecao.jsx mostra o erro se uma tela quebrar.
- ABRIR-O-APP.html na raiz do zip abre com dois cliques no computador (cópia de dist/index.html gerada pelo npm run build); o index.html da raiz é o código-fonte e avisa para abrir o ABRIR-O-APP.html.
- Planilhas (menu Gestão → Planilhas; atalhos em Meu QG e em Pedidos): .xlsx com moeda, datas e números de verdade, filtro nos títulos e linha Total com SUBTOTAL (respeita o filtro). Base em src/lib/excel.js (SheetJS 0.18.5 via cdnjs).
- Financeiro (src/lib/financeiro.js): período Este mês / Mês passado / Últimos 3 meses / Este ano / Tudo / Escolher datas; na tela: Vendido, Recebido, A receber hoje, Lucro estimado; planilha com Resumo (indicadores + por mês), Movimentações (recebimentos e devoluções pela data do pagamento), Pedidos (sem cancelados), Cancelados, Itens vendidos (desconto rateado), A receber (todos em aberto, dias de atraso), Orçamentos e Custos fixos. Vendas contam pela data do pedido. Lucro = produtos − descontos − imposto − custo (envio fora). Custo guardado no item (custoUnitario) ao criar orçamento/pedido; pedidos antigos usam o cálculo atual.
- Estoque: campo "Em estoque" (opcional) em filamentos (carretéis), resinas (frascos) e insumos (na unidade de uso); coluna Estoque e valor em estoque no Meu QG.
- Importar materiais (src/lib/materiais.js + ImportarMateriais.jsx): .xlsx/.xls/.ods/.csv (CSV com ; e vírgula, UTF-8 ou Windows-1252); tabela modelo com abas Filamentos/Resinas/Insumos/Como preencher; reconhece colunas por nome (Nome, Preço, Peso, Volume, Unidade, Qtd. no pacote, Em estoque, Código…), números com vírgula, "1 kg" → 1000 g, "1 L" → 1000 ml, cor e tipo pelo nome; conferência antes de salvar (Novo / Atualiza / Sem mudança / Erro / Repetido / Exemplo); atualiza pelo Código do app ou pelo nome (opção "Cadastrar outro"); só as colunas preenchidas mudam; ignora linhas "Exemplo…" e "Total". Exportar → editar no Excel → importar de volta atualiza sem duplicar.
- App iOS (iPhone/iPad, iOS 15+): Capacitor 8.6 com Swift Package Manager (pasta ios/), build "npm run build:ios" → www/ (vite --mode ios: alias @plataforma → src/plataforma/ios.js; fontes Archivo/IBM Plex e jsPDF 2.5.1/SheetJS 0.18.5 locais em ios-recursos/publico; viewport sem zoom nos campos). No app: dados em arquivos JSON por coleção em Library/Bancada3D (src/lib/arquivosBackend.js, gravação segura .tmp + troca, testes em tests/armazenamento.test.mjs); PDF/Excel/backup pelo menu Compartilhar (@capacitor/filesystem + @capacitor/share); barra de status acompanha o tema (@capacitor/status-bar); Info.plist em pt-BR com permissões de câmera/fotos; ícone e tela de abertura próprios. A versão web não carrega nada do Capacitor (alias @plataforma → src/plataforma/web.js).
- GitHub Actions (.github/workflows/ios.yml, runner macos-26, Node 22): npm ci → npm test → build:ios → cap sync ios → xcodebuild archive sem assinatura → .ipa em Artifacts (opcional: Release). Entradas: bundle_id, versao, publicar_release. O .ipa é assinado no GBox com .p12 + .mobileprovision do usuário.
- Visual: identidade própria (Archivo + IBM Plex, laranja de filamento sobre cinza frio), claro e escuro, celular com barra inferior.

Regras do projeto:
- Não usar nome, logo, textos ou imagens do QG Maker; manter a marca Bancada 3D (ou a que eu pedir).
- Mudanças em cima da versão mais recente, sem quebrar o que funciona.
- Entregar sempre o pacote completo, listar arquivo por arquivo com a pasta de destino no servidor e dizer onde cada comando é digitado.
- Ao terminar, mandar um prompt de contexto atualizado como este.

Próximo passo que eu quero: [descreva aqui]
