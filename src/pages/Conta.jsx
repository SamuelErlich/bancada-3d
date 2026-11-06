import { useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Modal, Secao, Seg, SeletorArquivo, Texto, Aviso, useConfirmar, Pill } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'
import { baixarArquivo, lerArquivoComoTexto } from '../lib/files.js'
import { xlsxClientesPedidos } from '../lib/planilha.js'
import { COLECOES } from '../lib/storage.js'
import { hojeISO } from '../lib/format.js'
import { plataforma } from '../lib/plataforma.js'

export function lerAparencia() {
  try {
    return localStorage.getItem('bancada3d.aparencia') || 'sistema'
  } catch (e) {
    return 'sistema'
  }
}

export function aplicarAparencia(v) {
  const el = document.documentElement
  if (v === 'claro' || v === 'escuro') el.setAttribute('data-aparencia', v)
  else el.removeAttribute('data-aparencia')
}

export default function Conta({ aparencia, setAparencia }) {
  const { dados, api, estado } = useStore()
  const toast = useToast()
  const confirmar = useConfirmar()
  const [apagar, setApagar] = useState(false)
  const [texto, setTexto] = useState('')
  const [ocupado, setOcupado] = useState('')
  const temExemplos = COLECOES.some((c) => Object.values(dados[c]).some((d) => d.exemplo))
  const contagem = {
    calculos: Object.keys(dados.produtos).length,
    clientes: Object.keys(dados.clientes).length,
    orcamentos: Object.keys(dados.orcamentos).length,
    pedidos: Object.keys(dados.pedidos).length,
    imagens: Object.keys(dados.midias).length,
  }

  const exportar = async () => {
    setOcupado('backup')
    try {
      const backup = await api.exportarTudo()
      const r = await baixarArquivo(`bancada3d-backup-${hojeISO()}.json`, JSON.stringify(backup), 'application/json')
      if (r === 'salvo') toast('Backup pronto')
    } catch (e) {
      toast(e.message || 'Não foi possível gerar o backup.', 'bad')
    } finally {
      setOcupado('')
    }
  }

  const importar = async (file) => {
    try {
      const txt = await lerArquivoComoTexto(file)
      const backup = JSON.parse(txt)
      if (!backup || backup.app !== 'Bancada 3D' || !backup.config) throw new Error('Este arquivo não é um backup do Bancada 3D.')
      const okk = await confirmar({
        titulo: 'Restaurar este backup?',
        texto: `Todos os dados atuais serão substituídos pelos do backup de ${backup.exportadoEm ? new Date(backup.exportadoEm).toLocaleString('pt-BR') : 'data desconhecida'}.`,
        acao: 'Substituir dados',
        perigo: true,
      })
      if (!okk) return
      setOcupado('importar')
      await api.importarTudo(backup)
      toast('Backup restaurado')
    } catch (e) {
      toast(e instanceof SyntaxError ? 'O arquivo não é um JSON válido.' : e.message || 'Não foi possível restaurar.', 'bad')
    } finally {
      setOcupado('')
    }
  }

  const planilha = async () => {
    setOcupado('planilha')
    try {
      const blob = await xlsxClientesPedidos(dados)
      const r = await baixarArquivo(`clientes-e-pedidos-${hojeISO()}.xlsx`, blob)
      if (r === 'salvo') toast('Planilha pronta')
    } catch (e) {
      toast(e.message || 'Não foi possível gerar a planilha.', 'bad')
    } finally {
      setOcupado('')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="label">Ajustes</span>
          <h1>Minha conta</h1>
          <p>{plataforma.nativo ? 'Aparência, onde seus dados ficam e cópias de segurança.' : 'Aparência, onde seus dados ficam, cópias de segurança e instalação na tela inicial.'}</p>
        </div>
      </div>

      <Secao titulo="Aparência" descricao={plataforma.nativo ? 'Fica salva neste aparelho.' : 'Fica salva só neste navegador.'}>
        <Seg
          valor={aparencia}
          onMuda={(v) => {
            setAparencia(v)
            try {
              localStorage.setItem('bancada3d.aparencia', v)
            } catch (e) {
              /* sem armazenamento local */
            }
          }}
          rotulo="Aparência"
          opcoes={[
            { valor: 'claro', rotulo: 'Claro' },
            { valor: 'escuro', rotulo: 'Escuro' },
            { valor: 'sistema', rotulo: 'Sistema' },
          ]}
        />
      </Secao>

      <Secao titulo="Seus dados">
        <div className="row">
          <span className={'dot' + (estado.tipo === 'memoria' ? ' bad' : '')} />
          <span className="strong">{estado.descricao}</span>
        </div>
        <p className="small muted">
          {estado.tipo === 'conta'
            ? 'Os dados ficam no seu espaço privado do Claude e aparecem em qualquer aparelho onde você abrir este app com a sua conta.'
            : estado.tipo === 'aparelho'
              ? 'Os dados ficam guardados no próprio aparelho, dentro do app, e entram no backup do iCloud do iPhone/iPad. Para levar para outro aparelho, exporte um backup e restaure no outro.'
              : estado.tipo === 'navegador'
              ? 'Os dados ficam neste navegador, neste aparelho. Para usar em outro aparelho ou trocar de navegador, exporte um backup e restaure no outro.'
              : 'Este navegador não permite salvar. Exporte um backup antes de fechar.'}
        </p>
        <div className="stats">
          <div className="stat-card stat">
            <span className="label">Cálculos</span>
            <span className="v">{contagem.calculos}</span>
          </div>
          <div className="stat-card stat">
            <span className="label">Clientes</span>
            <span className="v">{contagem.clientes}</span>
          </div>
          <div className="stat-card stat">
            <span className="label">Orçamentos</span>
            <span className="v">{contagem.orcamentos}</span>
          </div>
          <div className="stat-card stat">
            <span className="label">Pedidos</span>
            <span className="v">{contagem.pedidos}</span>
          </div>
        </div>
        <div className="actions">
          <Btn variante="primary" icone="baixar" onClick={exportar} disabled={!!ocupado}>
            {ocupado === 'backup' ? 'Gerando backup…' : 'Exportar backup completo (.json)'}
          </Btn>
          <Btn icone="baixar" onClick={planilha} disabled={!!ocupado}>
            {ocupado === 'planilha' ? 'Gerando…' : 'Baixar clientes e pedidos (.xlsx)'}
          </Btn>
        </div>
        <SeletorArquivo aceitar=".json,application/json" onArquivo={importar} maxMB={200}>
          <Icon nome="subir" />
          <span className="strong small">{ocupado === 'importar' ? 'Restaurando…' : 'Restaurar um backup'}</span>
          <span className="tiny muted">Escolha o arquivo .json exportado por este app. Ele substitui os dados atuais.</span>
        </SeletorArquivo>
      </Secao>

      {temExemplos && (
        <Secao titulo="Dados de exemplo" descricao="Impressoras, materiais, produtos, clientes, orçamentos e pedidos marcados como exemplo.">
          <div>
            <Btn
              icone="lixo"
              onClick={async () => {
                const okk = await confirmar({ titulo: 'Apagar os dados de exemplo?', texto: 'Só os itens de exemplo saem. O que você cadastrou continua.', acao: 'Apagar exemplos', perigo: true })
                if (okk) {
                  await api.apagarExemplos()
                  toast('Exemplos apagados')
                }
              }}
            >
              Apagar dados de exemplo
            </Btn>
          </div>
        </Secao>
      )}

      {!plataforma.nativo && (
      <Secao titulo="Instalar na tela inicial" descricao="Abre como um aplicativo, em tela cheia, a partir do ícone.">
        <div className="grid-2">
          <div className="well stack-sm small">
            <span className="strong">iPhone e iPad (Safari)</span>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>Abra o endereço do app no Safari.</li>
              <li>Toque em Compartilhar (o quadrado com a seta).</li>
              <li>Escolha “Adicionar à Tela de Início” e confirme.</li>
            </ol>
          </div>
          <div className="well stack-sm small">
            <span className="strong">Android (Chrome)</span>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>Abra o endereço do app no Chrome.</li>
              <li>Toque no menu ⋮ no canto superior.</li>
              <li>Escolha “Instalar app” ou “Adicionar à tela inicial”.</li>
            </ol>
          </div>
          <div className="well stack-sm small">
            <span className="strong">Windows e Mac (Chrome ou Edge)</span>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>Abra o endereço do app.</li>
              <li>Clique no ícone de instalar na barra de endereço.</li>
              <li>Confirme em “Instalar”.</li>
            </ol>
          </div>
          <div className="well stack-sm small">
            <span className="strong">Mac (Safari)</span>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              <li>Abra o endereço do app no Safari.</li>
              <li>Menu Arquivo → “Adicionar ao Dock”.</li>
            </ol>
          </div>
        </div>
        <p className="tiny muted">A instalação funciona quando o app está publicado no seu domínio com https.</p>
      </Secao>
      )}

      <Secao titulo="Zona de perigo">
        <p className="small muted">Apaga cálculos, cadastros, clientes, orçamentos, pedidos e imagens. Exporte um backup antes.</p>
        <div>
          <Btn variante="danger" icone="lixo" onClick={() => setApagar(true)}>
            Apagar todos os dados
          </Btn>
        </div>
      </Secao>

      <Modal
        aberto={apagar}
        onFechar={() => {
          setApagar(false)
          setTexto('')
        }}
        titulo="Apagar todos os dados?"
        subtitulo="Não dá para desfazer. Para confirmar, digite APAGAR."
        rodape={
          <>
            <Btn onClick={() => setApagar(false)}>Voltar</Btn>
            <Btn
              variante="danger-solid"
              disabled={texto.trim().toUpperCase() !== 'APAGAR' || !!ocupado}
              onClick={async () => {
                setOcupado('apagar')
                try {
                  await api.apagarTudo()
                  toast('Todos os dados foram apagados')
                  setApagar(false)
                  setTexto('')
                } catch (e) {
                  toast(e.message || 'Não foi possível apagar tudo.', 'bad')
                } finally {
                  setOcupado('')
                }
              }}
            >
              Apagar tudo
            </Btn>
          </>
        }
      >
        <Texto rotulo="Confirmação" valor={texto} onMuda={setTexto} placeholder="APAGAR" />
      </Modal>
    </div>
  )
}
