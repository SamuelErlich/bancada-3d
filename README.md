# Bancada 3D

Aplicativo em React para quem vende impressão 3D: precificação (FDM e resina), catálogo com foto e SKU, orçamentos em PDF com a sua marca, pedidos com etapas, recebimentos e aviso pelo WhatsApp, clientes com histórico e imagens do produto com IA.

## Como abrir

Escolha um dos três jeitos:

1. **Aqui no Claude (celular ou computador):** toque no card "Bancada 3D" da conversa. Os dados ficam salvos na sua conta do Claude. Se o Claude pedir permissão para guardar os dados, toque em "Permitir".
2. **No computador, sem servidor:**
   - Clique com o botão direito no arquivo `bancada-3d.zip` → "Extrair tudo…" (Windows) ou dê dois cliques nele (Mac).
   - Abra a pasta `bancada-3d` que apareceu.
   - Dê dois cliques no arquivo `ABRIR-O-APP.html`. Ele abre no navegador e os dados ficam salvos nesse navegador.
   - Não use o `index.html` dessa pasta: ele é o código-fonte e não abre sozinho.
3. **No seu domínio:** veja "Publicar no seu domínio" abaixo.

Se algo impedir a abertura, o app mostra o motivo na tela (nunca fica em branco). Dentro do Claude, se a conta demorar, aparece o botão "Abrir agora usando este navegador".

## Módulos

| Módulo | O que faz |
|---|---|
| Meu QG | Impressoras (FDM, resina, estação de lavagem e cura), filamentos, resinas e insumos. Todo cálculo puxa daqui. |
| Cálculos | Custo por peça com várias peças por produto, multicor (purga), unidades na mesa, insumos, trabalho manual, custos fixos rateados, markup ou preço manual, preço por canal (Shopee por faixa, Mercado Livre, cartão, Pix), simulador de desconto, PDF e Excel. |
| Catálogo | Produtos promovidos, foto, descrição, SKU (gerar → revisar → confirmar), atalho para orçar. |
| Orçamentos | Cliente, itens do catálogo, envio, validade, prazo, desconto no Pix, parcelas, observações, numeração própria, PDF com logo, mensagem pronta para WhatsApp. |
| Pedidos | Do orçamento aprovado ou direto do catálogo. Confirmado → Em preparo → Pronto → Entregue, corrigir etapa, reabrir, cancelar, recebimentos (sinal e restante), devoluções, prazos, atrasados, aviso por WhatsApp, histórico. |
| Clientes | Cadastro, observação interna, histórico de pedidos e orçamentos, arquivar. |
| Imagens com IA | Foto da peça + descrição + cena → imagem de vitrine (Google Gemini ou OpenAI, com a sua chave). Minhas imagens e associação ao catálogo. |
| Planilhas | Excel (.xlsx) com moeda, datas e números de verdade, filtro nos títulos e totais que respeitam o filtro. Financeiro por período (resumo por mês, movimentações, pedidos, itens vendidos, a receber, cancelados, orçamentos, custos fixos). Materiais e estoque: exportar, tabela modelo e importar (.xlsx, .xls, .ods ou .csv) com conferência antes de salvar. |
| Meu negócio | Dados e logo do orçamento, tarifa de energia, valor da hora, imposto, markups, custos fixos, canais de venda e taxas, condições padrão, prefixo do SKU. |
| Minha conta | Aparência (claro/escuro/sistema), backup completo (.json), restaurar backup, planilha de clientes e pedidos, apagar exemplos, instalação na tela inicial. |

## Publicar no seu domínio (sem programar)

A pasta `dist/` já vem pronta. Envie estes arquivos para a mesma pasta do servidor (exemplo usando a subpasta `bancada`):

| Arquivo do zip | Destino no servidor |
|---|---|
| `dist/index.html` | `public_html/bancada/index.html` |
| `dist/manifest.webmanifest` | `public_html/bancada/manifest.webmanifest` |
| `dist/sw.js` | `public_html/bancada/sw.js` |
| `dist/icon-192.png` | `public_html/bancada/icon-192.png` |
| `dist/icon-512.png` | `public_html/bancada/icon-512.png` |
| `dist/icon-maskable-512.png` | `public_html/bancada/icon-maskable-512.png` |

- Para o servidor vão só os arquivos da pasta `dist/`. O `ABRIR-O-APP.html` e o `index.html` da raiz não vão.
- Primeira vez: não precisa apagar nada.
- Atualização: substitua `index.html` e `sw.js` (os outros só mudam se você trocar os ícones).
- Use https (SSL ativo) para o botão de instalar aparecer no celular e no computador.
- O app abre em `https://seudominio.com.br/bancada/`.

Os dados ficam no navegador de quem usa (IndexedDB). Para levar para outro aparelho: Minha conta → Exportar backup → no outro aparelho, Restaurar um backup.

## App para iPhone e iPad (iOS)

O app do iPhone/iPad é o mesmo Bancada 3D, empacotado com o Capacitor 8. O GitHub Actions compila e entrega um `.ipa` **sem assinatura**; você assina no GBox com o seu certificado de desenvolvedor (`.p12` + senha + `.mobileprovision`).

No app:
- Os dados ficam guardados no próprio aparelho, dentro do app (não somem se o iPhone precisar de espaço e entram no backup do iCloud).
- PDF, Excel e backup abrem o menu Compartilhar do iOS: Salvar em Arquivos, WhatsApp, AirDrop, e-mail.
- Fontes, PDF e Excel vêm dentro do app: funciona sem internet. Só Imagens com IA e o WhatsApp precisam de internet.
- iOS 15 ou mais novo, iPhone e iPad.

### Passo 1 — Subir o projeto para o GitHub (pelo site, sem programar)

1. Extraia o `bancada-3d.zip` no computador.
2. Entre em github.com com a sua conta. Clique no **+** (canto superior direito) → **New repository**. Nome: `bancada-3d`. Escolha **Private** ou **Public**. Clique em **Create repository**.
3. Na página do repositório novo, clique no link **uploading an existing file**.
4. Primeiro envio: abra a pasta `bancada-3d` extraída, selecione **tudo que está dentro dela, menos a pasta `ios`**, e arraste para a página do GitHub. A pasta `.github` precisa ir junto:
   - Windows: ela aparece normalmente.
   - Mac: dentro da pasta, aperte **Cmd + Shift + .** (ponto) para mostrar as pastas escondidas.
5. Espere carregar e clique em **Commit changes**.
6. Segundo envio: na página do repositório, clique em **Add file** → **Upload files**, arraste a **pasta `ios`** inteira e clique em **Commit changes**. (O GitHub aceita até 100 arquivos por envio; por isso são dois.)

### Passo 2 — Gerar o .ipa no GitHub Actions

1. No repositório, clique na aba **Actions**. Se aparecer um aviso, clique no botão verde para ativar os workflows.
2. À esquerda, clique em **App iOS (.ipa para assinar)** e, à direita, em **Run workflow**.
3. Preencha e clique no botão verde **Run workflow**:
   - **Bundle ID**: o App ID do seu `.mobileprovision` (ex.: `com.seunome.bancada3d`). Se o perfil for coringa (`*`), pode deixar `com.bancada3d.app`.
   - **Versão**: `1.0.0` (aumente a cada atualização: 1.0.1, 1.0.2…).
   - **Release**: marque se quiser um link direto para baixar o `.ipa` no iPhone. Em repositório privado o link pede login no GitHub.
4. Espere ficar verde (uns 10 a 15 minutos). Em repositório privado, o macOS gasta mais minutos do plano gratuito do GitHub.
5. Clique na execução e, no fim da página, em **Artifacts**, baixe **Bancada3D-1.0.0-ipa-sem-assinatura**. Vem um `.zip`; dentro dele está o `Bancada3D-1.0.0.ipa`.

Se aparecer erro dizendo que não há máquina `macos-26` disponível, abra `.github/workflows/ios.yml` no GitHub (ícone de lápis), troque `macos-26` por `macos-latest` e salve.

### Passo 3 — Assinar e instalar no GBox

1. Passe o `.ipa` para o iPhone: AirDrop, iCloud Drive, ou baixe pelo Safari no próprio iPhone (página do Actions ou da Release).
2. No GBox, importe o `.ipa`, escolha o seu certificado (`.p12` + senha + `.mobileprovision`), assine e instale.
3. Certificado de **desenvolvedor**: o iPhone precisa estar no `.mobileprovision` (UDID) e, no iOS 16 ou mais novo, com o **Modo de Desenvolvedor** ligado (Ajustes → Privacidade e Segurança → Modo de Desenvolvedor). O iPhone reinicia e pede para confirmar.

Para atualizar: rode o workflow de novo com uma versão maior e o **mesmo Bundle ID**, assine e instale por cima. Os dados continuam.

### Arquivos do app iOS

| Arquivo ou pasta | Para que serve |
|---|---|
| `.github/workflows/ios.yml` | Receita do GitHub Actions: testa, gera o app, compila sem assinatura e monta o `.ipa`. |
| `capacitor.config.json` | Nome do app (Bancada 3D), Bundle ID padrão e ajustes da tela. |
| `ios/` | Projeto do Xcode (Capacitor 8, Swift Package Manager): ícone, tela de abertura, permissões (câmera e fotos) e idioma português. |
| `ios-recursos/publico/` | jsPDF, SheetJS e as fontes (Archivo e IBM Plex, licença OFL) que vão dentro do app. |
| `src/plataforma/ios.js` | O que muda no app: arquivos no aparelho, menu Compartilhar e cor da barra de status. |
| `src/lib/arquivosBackend.js` | Gravação segura dos dados em arquivos (testada em `tests/armazenamento.test.mjs`). |

Tem Mac com Xcode 26? Pode compilar nele também. Abra o Terminal na pasta do projeto e digite `npm install` (Enter), depois `npm run ios` (Enter), depois `npx cap open ios` (Enter). O Xcode abre o projeto.

## Editar o código

1. Instale o Node.js 22 LTS (em nodejs.org). Só precisa fazer uma vez.
2. Extraia o zip, por exemplo em `C:\projetos\bancada-3d` (Windows) ou em `Documentos/bancada-3d` (Mac).
3. Abra um terminal dentro dessa pasta:
   - Windows: abra a pasta `bancada-3d` no Explorador de Arquivos, clique na barra de endereço, apague o texto, digite `cmd` e aperte Enter. Abre o Prompt de Comando já dentro da pasta.
   - Mac: no Finder, clique com o botão direito na pasta `bancada-3d` → “Novo Terminal na Pasta”.
4. Nesse terminal, digite `npm install` e aperte Enter. Espere terminar (baixa o Vite e o React). Só na primeira vez (e de novo se o `package.json` mudar numa atualização).
5. No mesmo terminal, digite `npm run dev` e aperte Enter. Abra no navegador o endereço que aparecer (normalmente `http://localhost:5173`). Cada arquivo salvo atualiza a tela na hora. Para parar, aperte Ctrl+C nesse terminal.
6. Para gerar os arquivos de publicação, no mesmo terminal (com o `dev` parado), digite `npm run build` e aperte Enter. A pasta `dist/` é recriada com o app novo e o `ABRIR-O-APP.html` é atualizado junto.
7. Para conferir o motor de preço, a importação de planilhas e o armazenamento do app, digite `npm test` e aperte Enter. Devem aparecer três linhas com “todos os testes passaram”.

## Onde fica cada coisa no código

| Arquivo | Conteúdo |
|---|---|
| `src/lib/pricing.js` | Motor de preço: custos FDM e resina, manutenção por nível de uso, faixas de taxa, preço por canal, simulador de desconto. |
| `src/lib/defaults.js` | Canais e taxas de referência, modelos de impressora, tipos de filamento, sugestões de insumos, cenas da IA e dados de exemplo. Nome do app em `NOME_APP`. |
| `src/lib/negocio.js` | Regras de orçamento, pedido, saldo, atraso, mensagens de WhatsApp e SKU. |
| `src/lib/pdf.js` | PDF do orçamento e ficha de custo. |
| `src/lib/planilha.js` | Exportação para Excel do catálogo/cálculos e de clientes e pedidos. |
| `src/lib/excel.js` | Base das planilhas: moeda, datas, filtro e totais; leitura de .xlsx, .xls, .ods e .csv (CSV brasileiro com ; e vírgula). |
| `src/lib/financeiro.js` | Contas do financeiro por período e a planilha financeira. |
| `src/lib/materiais.js` | Estoque, exportação de materiais, tabela modelo e as regras da importação (colunas reconhecidas, números com vírgula, kg → g, cor e tipo pelo nome). |
| `src/components/ImportarMateriais.jsx` | Tela de importação com a conferência (novo, atualiza, sem mudança, erro). |
| `src/pages/Planilhas.jsx` | Tela Planilhas. |
| `src/lib/ia.js` | Geração de imagem (Gemini / OpenAI). |
| `src/lib/storage.js` | Onde os dados são salvos (conta do Claude, navegador ou memória), com tempo-limite e plano B para nunca travar a abertura. |
| `src/components/Protecao.jsx` | Se uma tela quebrar, mostra o erro em vez de deixar a página em branco. |
| `index.html` | Entrada do código. Tem a tela "Abrindo…" e o aviso que aparece se o app não carregar. |
| `ABRIR-O-APP.html` | Cópia pronta do app para abrir com dois cliques (gerada pelo `npm run build`). |
| `src/pages/*.jsx` | Uma tela por módulo. |
| `src/styles.css` | Cores (claro e escuro), tipografia e componentes. |

## Fórmulas

- Material (FDM): preço do carretel ÷ peso do carretel × gramas da mesa ÷ unidades na mesa. Purga usa o custo médio por grama.
- Energia: consumo médio (kW) × horas × tarifa ÷ unidades.
- Máquina: valor ÷ (meses × horas por dia × dias por mês) × horas ÷ unidades. Ou valor ÷ vida útil em horas.
- Manutenção: valor × % anual (FDM 5/10/15/25%, resina 4/8/12/16% por nível de uso; estação 5%) ÷ (horas por dia × dias por mês × 12) × horas ÷ unidades.
- Resina: volume × preço do litro ÷ 1000 ÷ unidades, mais perda, tela LCD (preço ÷ vida em horas × horas) e FEP (preço ÷ impressões).
- Reserva para falhas: % sobre material + purga + energia + máquina + manutenção (+ LCD e FEP na resina).
- Custo total: peças + trabalho manual (minutos ÷ 60 × sua hora) + insumos + custos fixos ÷ produção mensal.
- Preço: custo × markup (ou o seu preço). Lucro = preço − custo − imposto.
- Preço no canal: (preço direto × (1 − imposto) + taxa fixa) ÷ (1 − comissão − imposto). Em canais por faixa, o app testa faixa por faixa e usa o menor preço que mantém o lucro.

## Imagens com IA

Use a sua chave do Google AI Studio (Gemini) ou da OpenAI em Imagens com IA → Provedor e chave. A chave fica só no navegador. Dentro do Claude a geração fica desligada (o ambiente não deixa a página falar com serviços externos); no seu domínio ela funciona.
