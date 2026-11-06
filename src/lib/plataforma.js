// O que muda quando o Bancada 3D roda como aplicativo (iPhone/iPad) em vez de página web.
// main.jsx preenche isto na abertura com src/plataforma/web.js ou src/plataforma/ios.js (build "ios").
// Campos opcionais:
//   nativo            true dentro do app instalado
//   armazenamento()   backend de dados próprio do app (arquivos no aparelho)
//   salvarArquivo(nome, blob)  entrega um arquivo (no iOS: menu Compartilhar → Salvar em Arquivos, WhatsApp…)
//   scriptLocal(nome) caminho local de uma biblioteca (jsPDF, SheetJS) para funcionar sem internet
export const plataforma = { nativo: false, nome: 'web' }

export function definirPlataforma(p) {
  Object.assign(plataforma, p || {})
}
