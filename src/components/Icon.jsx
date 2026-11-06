// Ícones de traço desenhados para o app (24×24).
const P = {
  inicio: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h5v-6h3v6h5V9.5',
  qg: 'M4 20V9l8-5 8 5v11M4 20h16M9 20v-6h6v6M8 10.5h8',
  calculo: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7.5 7h9M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01',
  catalogo: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  orcamento: 'M7 3h7l5 5v13H7zM14 3v5h5M10 12h6M10 16h6',
  pedido: 'M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5zM3.5 7.5 12 12l8.5-4.5M12 12v9',
  clientes: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.3c1.8.8 3 2.6 3 4.7',
  ia: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18.5 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9zM5 15.5l.6 1.4 1.4.6-1.4.6L5 19.5l-.6-1.4-1.4-.6 1.4-.6z',
  negocio: 'M4 9h16l-1.5-5h-13zM5 9v11h14V9M9.5 20v-6h5v6M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0',
  conta: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.9-3.6 3.9-6 7.5-6s6.6 2.4 7.5 6',
  ajuda: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.7M12 17.2h.01',
  mais: 'M5 12h.01M12 12h.01M19 12h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  mais2: 'M12 5v14M5 12h14',
  lixo: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  copiar: 'M9 9h11v11H9zM5 15V4h11',
  baixar: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  subir: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  compartilhar: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  whats: 'M4 20l1.3-3.9A8 8 0 1 1 8 19zM9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.3-2-1-1 .8a4 4 0 0 1-2-2l.8-1-1-2z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  fechar: 'M6 6l12 12M18 6L6 18',
  voltar: 'M15 5l-7 7 7 7',
  seta: 'M9 5l7 7-7 7',
  busca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  impressora: 'M5 3h14v18H5zM5 8h14M9 8v4l3 3 3-3V8M8 18h8',
  carretel: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v6M12 15v6',
  caixa: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
  alerta: 'M12 3l9.5 17h-19zM12 10v4.5M12 17.5h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01',
  imagem: 'M4 5h16v14H4zM4 16l5-5 4 4 2.5-2.5L20 17M15.5 9.5h.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  externo: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  estrela: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  camadas: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  dinheiro: 'M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9v.01M18 15v.01',
  arquivo: 'M4 7h16v13H4zM3 4h18v3H3zM10 11h4',
  planilha: 'M4 4h16v16H4zM4 9h16M4 14.5h16M9.5 9v11',
  sol: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  lua: 'M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z',
  telefone: 'M7 3h10v18H7zM11 18h2',
  filtro: 'M4 5h16l-6 7.5V19l-4 1.5v-8z',
  reabrir: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  cancelar: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8',
  sku: 'M4 6v12M7 6v12M10 6v12M14 6v12M16 6v12M20 6v12',
  pix: 'M12 3l3.5 3.5-3.5 3.5L8.5 6.5zM12 14l3.5 3.5L12 21l-3.5-3.5zM3 12l3.5-3.5L10 12l-3.5 3.5zM14 12l3.5-3.5L21 12l-3.5 3.5z',
}

export default function Icon({ nome, tamanho = 18, cor, titulo, preenchido = false, className }) {
  const d = P[nome] || P.info
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill={preenchido ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titulo ? undefined : 'true'}
      role={titulo ? 'img' : undefined}
      style={cor ? { color: cor } : undefined}
      className={className}
    >
      {titulo && <title>{titulo}</title>}
      <path d={d} />
    </svg>
  )
}

export function Logo({ tamanho = 34 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--accent)" />
      <g fill="var(--accent-ink)">
        <rect x="12" y="41" width="40" height="6" rx="3" />
        <rect x="16" y="32" width="32" height="6" rx="3" />
        <rect x="20" y="23" width="24" height="6" rx="3" />
        <rect x="25" y="14" width="14" height="6" rx="3" />
      </g>
    </svg>
  )
}
