import { Component } from 'react'

// Se alguma tela quebrar, mostra o que aconteceu em vez de deixar a página em branco.
// tela = true: problema só nesta tela (o resto do app continua).
export default class Protecao extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
  }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  componentDidCatch(erro, info) {
    try {
      console.warn('Bancada 3D — erro na tela:', erro, info && info.componentStack)
    } catch (e) {
      /* sem console */
    }
  }

  render() {
    const { erro } = this.state
    if (!erro) return this.props.children
    const detalhe = String((erro && erro.message) || erro || 'erro desconhecido')

    if (this.props.tela) {
      return (
        <div className="page">
          <div className="card pad-lg stack" style={{ maxWidth: 560 }}>
            <h2>Esta tela teve um problema</h2>
            <p className="muted">Seus dados continuam salvos. Volte ao início ou recarregue a página.</p>
            <code className="tiny muted" style={{ wordBreak: 'break-word' }}>{detalhe}</code>
            <div className="row">
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  this.setState({ erro: null })
                  if (this.props.onInicio) this.props.onInicio()
                }}
              >
                Voltar ao início
              </button>
              <button type="button" className="btn" onClick={() => location.reload()}>
                Recarregar
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="welcome">
        <div className="card pad-lg stack" style={{ width: 'min(520px, 100%)' }}>
          <h2>O app teve um problema ao abrir</h2>
          <p className="muted">Recarregue a página. Se continuar, mande um print desta tela.</p>
          <code className="tiny muted" style={{ wordBreak: 'break-word' }}>{detalhe}</code>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => location.reload()}>
              Recarregar
            </button>
          </div>
        </div>
      </div>
    )
  }
}
