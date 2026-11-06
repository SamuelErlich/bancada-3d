import { useCallback, useEffect, useState } from 'react'
import { useStore } from './store.jsx'
import Icon, { Logo } from './components/Icon.jsx'
import { Btn, Modal } from './components/ui.jsx'
import { NOME_APP } from './lib/defaults.js'
import { atrasado, emAndamento } from './lib/negocio.js'
import Inicio from './pages/Inicio.jsx'
import MeuQG from './pages/MeuQG.jsx'
import Calculos from './pages/Calculos.jsx'
import Calculadora from './pages/Calculadora.jsx'
import Catalogo from './pages/Catalogo.jsx'
import Orcamentos from './pages/Orcamentos.jsx'
import Pedidos from './pages/Pedidos.jsx'
import Clientes from './pages/Clientes.jsx'
import ImagensIA from './pages/ImagensIA.jsx'
import Negocio from './pages/Negocio.jsx'
import Conta, { aplicarAparencia, lerAparencia } from './pages/Conta.jsx'
import Ajuda from './pages/Ajuda.jsx'
import Planilhas from './pages/Planilhas.jsx'
import Boasvindas from './pages/Boasvindas.jsx'
import Protecao from './components/Protecao.jsx'

const PAGINAS = {
  inicio: { titulo: 'Início', icone: 'inicio', C: Inicio },
  'meu-qg': { titulo: 'Meu QG', icone: 'qg', C: MeuQG },
  calculos: { titulo: 'Cálculos', icone: 'calculo', C: Calculos },
  calculadora: { titulo: 'Cálculo', icone: 'calculo', C: Calculadora, ativo: 'calculos' },
  catalogo: { titulo: 'Catálogo', icone: 'catalogo', C: Catalogo },
  imagens: { titulo: 'Imagens com IA', icone: 'ia', C: ImagensIA },
  orcamentos: { titulo: 'Orçamentos', icone: 'orcamento', C: Orcamentos },
  pedidos: { titulo: 'Pedidos', icone: 'pedido', C: Pedidos },
  clientes: { titulo: 'Clientes', icone: 'clientes', C: Clientes },
  planilhas: { titulo: 'Planilhas', icone: 'planilha', C: Planilhas },
  negocio: { titulo: 'Meu negócio', icone: 'negocio', C: Negocio },
  conta: { titulo: 'Minha conta', icone: 'conta', C: Conta },
  ajuda: { titulo: 'Ajuda', icone: 'ajuda', C: Ajuda },
}

const GRUPOS = [
  { rotulo: null, itens: ['inicio'] },
  { rotulo: 'Produção', itens: ['meu-qg', 'calculos', 'catalogo', 'imagens'] },
  { rotulo: 'Vendas', itens: ['orcamentos', 'pedidos', 'clientes'] },
  { rotulo: 'Gestão', itens: ['planilhas'] },
  { rotulo: 'Ajustes', itens: ['negocio', 'conta', 'ajuda'] },
]

const TEXTO_ETAPA = {
  conta: 'Conectando à sua conta do Claude…',
  permissao: 'O Claude vai pedir permissão para guardar os dados do app. Toque em “Permitir”.',
  lendo: 'Carregando seus dados…',
}

function TelaAbrindo({ etapa, podeLocal, onLocal }) {
  const [demorou, setDemorou] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDemorou(true), 6000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="loading-screen">
      <div className="stack-sm loading-box">
        <Logo tamanho={44} />
        <div className="spin" />
        <span className="small">{TEXTO_ETAPA[etapa] || 'Abrindo sua bancada…'}</span>
        {podeLocal && demorou && (
          <div className="stack-sm loading-extra">
            <span className="small muted">Está demorando mais que o normal.</span>
            <Btn variante="primary" onClick={onLocal}>
              Abrir agora usando este navegador
            </Btn>
            <span className="tiny muted">Os dados ficam salvos só neste navegador. Depois dá para tentar a conta de novo.</span>
          </div>
        )}
      </div>
    </div>
  )
}

function FaixaAviso({ estado, recarregar, liberarAcesso }) {
  const [fechada, setFechada] = useState(false)
  if (!estado.aviso || fechada) return null
  const negado = estado.motivo === 'negado'
  return (
    <div className="faixa-aviso" role="status">
      <Icon nome="alerta" tamanho={17} />
      <span className="grow small">{estado.aviso}</span>
      <Btn tamanho="sm" onClick={negado ? liberarAcesso : recarregar}>
        {negado ? 'Liberar acesso' : 'Tentar a conta de novo'}
      </Btn>
      <Btn variante="ghost" tamanho="sm" icone="fechar" aria-label="Fechar aviso" onClick={() => setFechada(true)} />
    </div>
  )
}

function rotaDoHash() {
  const h = (typeof location !== 'undefined' ? location.hash : '').replace(/^#/, '')
  return PAGINAS[h] ? h : 'inicio'
}

export default function App() {
  const { estado, dados, salvando, recarregar, abrirLocal, liberarAcesso } = useStore()
  const [rota, setRota] = useState(rotaDoHash)
  const [params, setParams] = useState({})
  const [versao, setVersao] = useState(0)
  const [maisAberto, setMaisAberto] = useState(false)
  const [aparencia, setAparencia] = useState(lerAparencia)

  useEffect(() => {
    aplicarAparencia(aparencia)
  }, [aparencia])

  useEffect(() => {
    const voltar = () => {
      setRota(rotaDoHash())
      setParams({})
      setVersao((v) => v + 1)
    }
    window.addEventListener('popstate', voltar)
    window.addEventListener('hashchange', voltar)
    return () => {
      window.removeEventListener('popstate', voltar)
      window.removeEventListener('hashchange', voltar)
    }
  }, [])

  const ir = useCallback((destino, p = {}) => {
    const r = PAGINAS[destino] ? destino : 'inicio'
    setParams(p || {})
    setRota(r)
    setVersao((v) => v + 1)
    setMaisAberto(false)
    try {
      if (location.hash.replace(/^#/, '') !== r) history.pushState(null, '', '#' + r)
    } catch (e) {
      /* navegação só em memória */
    }
    window.scrollTo(0, 0)
  }, [])

  if (estado.carregando) {
    return <TelaAbrindo etapa={estado.etapa} podeLocal={estado.podeLocal} onLocal={abrirLocal} />
  }

  if (estado.erro) {
    return (
      <div className="welcome">
        <div className="card pad-lg stack" style={{ width: 'min(520px, 100%)' }}>
          <Logo tamanho={36} />
          <h2>Não foi possível abrir seus dados</h2>
          <p className="muted">{estado.erro}</p>
          <div className="row">
            <Btn variante="primary" onClick={recarregar}>
              Tentar de novo
            </Btn>
            {estado.podeLocal && <Btn onClick={abrirLocal}>Abrir usando este navegador</Btn>}
          </div>
          {estado.podeLocal && <p className="tiny muted">“Abrir usando este navegador” guarda os dados só neste navegador até a conta voltar a responder.</p>}
        </div>
      </div>
    )
  }

  const faixa = <FaixaAviso estado={estado} recarregar={recarregar} liberarAcesso={liberarAcesso} />

  const vazio = !dados.config.onboarding && !Object.keys(dados.produtos).length && !Object.keys(dados.impressoras).length
  if (vazio) {
    return (
      <>
        {faixa}
        <Boasvindas onEntrar={(destino) => ir(destino || 'inicio')} />
      </>
    )
  }

  const pag = PAGINAS[rota] || PAGINAS.inicio
  const ativo = pag.ativo || rota
  const Pagina = pag.C
  const contagem = {
    pedidos: Object.values(dados.pedidos).filter(emAndamento).length,
    catalogo: Object.values(dados.produtos).filter((p) => p.noCatalogo).length,
  }
  const temAtraso = Object.values(dados.pedidos).some(atrasado)
  const chave = `${rota}:${versao}`

  const estadoSalvar = (
    <div className="save-state" aria-live="polite">
      <span className={'dot' + (estado.tipo === 'memoria' ? ' bad' : salvando ? ' warn' : '')} />
      <span>{salvando ? 'Salvando…' : estado.descricao}</span>
    </div>
  )

  return (
    <div className="app">
      <aside className="side" aria-label="Módulos">
        <a
          className="brand"
          href="#inicio"
          onClick={(e) => {
            e.preventDefault()
            ir('inicio')
          }}
        >
          <Logo tamanho={34} />
          <div>
            <div className="brand-name">{NOME_APP}</div>
            <div className="brand-sub">{dados.config.negocio.nome || 'sua bancada de impressão 3D'}</div>
          </div>
        </a>
        {GRUPOS.map((g) => (
          <nav className="nav-group" key={g.rotulo || 'topo'} aria-label={g.rotulo || 'Início'}>
            {g.rotulo && <span className="label">{g.rotulo}</span>}
            {g.itens.map((id) => (
              <button key={id} type="button" className="nav-item" aria-current={ativo === id ? 'page' : undefined} onClick={() => ir(id)}>
                <Icon nome={PAGINAS[id].icone} />
                {PAGINAS[id].titulo}
                {id === 'pedidos' && contagem.pedidos > 0 && <span className={'nav-count' + (temAtraso ? ' bad-text' : '')}>{contagem.pedidos}</span>}
                {id === 'catalogo' && contagem.catalogo > 0 && <span className="nav-count">{contagem.catalogo}</span>}
              </button>
            ))}
          </nav>
        ))}
        <div className="side-foot">{estadoSalvar}</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <Logo tamanho={28} />
          <span className="strong grow">{pag.titulo}</span>
          {salvando && <span className="tiny muted">Salvando…</span>}
          <Btn variante="ghost" icone="menu" aria-label="Todos os módulos" onClick={() => setMaisAberto(true)} />
        </header>
        {faixa}
        <main>
          <Protecao key={chave} tela onInicio={() => ir('inicio')}>
            <Pagina params={params} ir={ir} aparencia={aparencia} setAparencia={setAparencia} />
          </Protecao>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Atalhos">
        {[
          ['inicio', 'Início', 'inicio'],
          ['calculos', 'Cálculos', 'calculo'],
          ['catalogo', 'Catálogo', 'catalogo'],
          ['pedidos', 'Pedidos', 'pedido'],
        ].map(([id, rot, ic]) => (
          <button key={id} type="button" aria-current={ativo === id ? 'page' : undefined} onClick={() => ir(id)}>
            <Icon nome={ic} tamanho={21} />
            {rot}
          </button>
        ))}
        <button type="button" aria-current={!['inicio', 'calculos', 'catalogo', 'pedidos'].includes(ativo) ? 'page' : undefined} onClick={() => setMaisAberto(true)}>
          <Icon nome="menu" tamanho={21} />
          Mais
        </button>
      </nav>

      <Modal aberto={maisAberto} onFechar={() => setMaisAberto(false)} titulo="Módulos">
        {GRUPOS.map((g) => (
          <div className="stack-sm" key={g.rotulo || 'topo'}>
            {g.rotulo && <span className="label">{g.rotulo}</span>}
            <div className="grid-2" style={{ gap: 6 }}>
              {g.itens.map((id) => (
                <button key={id} type="button" className="nav-item" aria-current={ativo === id ? 'page' : undefined} onClick={() => ir(id)}>
                  <Icon nome={PAGINAS[id].icone} />
                  {PAGINAS[id].titulo}
                </button>
              ))}
            </div>
          </div>
        ))}
        {estadoSalvar}
      </Modal>
    </div>
  )
}
