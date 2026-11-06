import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import { fmtBRL, numToInput, parseNum } from '../lib/format.js'
import { useImagem } from '../store.jsx'

export function Btn({ variante, tamanho, icone, children, className = '', bloco, ...rest }) {
  const cls = ['btn', variante, tamanho, bloco ? 'block' : '', !children ? 'icon' : '', className].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {icone && <Icon nome={icone} tamanho={tamanho === 'sm' ? 15 : 17} />}
      {children}
    </button>
  )
}

export function Field({ rotulo, dica, erro, children, htmlFor, className = '' }) {
  return (
    <div className={'field ' + className}>
      {rotulo && (htmlFor ? <label htmlFor={htmlFor}>{rotulo}</label> : <span className="field-label">{rotulo}</span>)}
      {children}
      {erro ? <span className="err">{erro}</span> : dica ? <span className="hint">{dica}</span> : null}
    </div>
  )
}

export function Texto({ rotulo, dica, erro, valor, onMuda, id, multilinha, className = '', ...rest }) {
  const auto = useId()
  const fid = id || 'f' + auto.replace(/:/g, '')
  return (
    <Field rotulo={rotulo} dica={dica} erro={erro} htmlFor={fid} className={className}>
      {multilinha ? (
        <textarea id={fid} className="textarea" value={valor ?? ''} onChange={(e) => onMuda(e.target.value)} {...rest} />
      ) : (
        <input id={fid} className="input" value={valor ?? ''} onChange={(e) => onMuda(e.target.value)} {...rest} />
      )}
    </Field>
  )
}

function iguais(a, b) {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return true
  return false
}

/** Campo numérico que aceita vírgula. onMuda recebe número, null (vazio) ou NaN (inválido). */
export function NumInput({ valor, onMuda, unidade, prefixo, id, casas = 4, placeholder, invalido, ...rest }) {
  const [txt, setTxt] = useState(() => numToInput(valor, casas))
  const ultimo = useRef(valor)
  useEffect(() => {
    if (!iguais(valor, ultimo.current)) {
      setTxt(numToInput(valor, casas))
      ultimo.current = valor
    }
  }, [valor, casas])
  return (
    <div className={'input-wrap' + (prefixo ? ' prefix' : '')}>
      <input
        id={id}
        className="input"
        inputMode="decimal"
        autoComplete="off"
        value={txt}
        placeholder={placeholder}
        aria-invalid={invalido ? 'true' : undefined}
        onChange={(e) => {
          const t = e.target.value
          setTxt(t)
          const n = parseNum(t)
          const v = t.trim() === '' ? null : n
          ultimo.current = v
          onMuda(v)
        }}
        {...rest}
      />
      {(unidade || prefixo) && <span className="unit">{prefixo || unidade}</span>}
    </div>
  )
}

export function Numero({ rotulo, dica, erro, valor, onMuda, unidade, prefixo, casas, placeholder, className = '', id, ...rest }) {
  const auto = useId()
  const fid = id || 'n' + auto.replace(/:/g, '')
  return (
    <Field rotulo={rotulo} dica={dica} erro={erro} htmlFor={fid} className={className}>
      <NumInput id={fid} valor={valor} onMuda={onMuda} unidade={unidade} prefixo={prefixo} casas={casas} placeholder={placeholder} invalido={!!erro} {...rest} />
    </Field>
  )
}

/** Percentual guardado como fração (0,05) e mostrado como 5. */
export function Percentual({ valor, onMuda, ...rest }) {
  const mostrado = valor === null || valor === undefined || !Number.isFinite(valor) ? valor : Math.round(valor * 1e8) / 1e6
  return (
    <Numero
      unidade="%"
      valor={mostrado}
      onMuda={(v) => onMuda(v === null || Number.isNaN(v) ? v : v / 100)}
      casas={4}
      {...rest}
    />
  )
}

export function Selecao({ rotulo, dica, erro, valor, onMuda, opcoes, vazio, id, className = '', ...rest }) {
  const auto = useId()
  const fid = id || 's' + auto.replace(/:/g, '')
  return (
    <Field rotulo={rotulo} dica={dica} erro={erro} htmlFor={fid} className={className}>
      <select id={fid} className="select" value={valor ?? ''} onChange={(e) => onMuda(e.target.value)} {...rest}>
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) =>
          o.grupo ? (
            <optgroup key={o.grupo} label={o.grupo}>
              {o.opcoes.map((x) => (
                <option key={x.valor} value={x.valor} disabled={x.desabilitado}>
                  {x.rotulo}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={o.valor} value={o.valor} disabled={o.desabilitado}>
              {o.rotulo}
            </option>
          ),
        )}
      </select>
    </Field>
  )
}

export function Check({ marcado, onMuda, children, id, ...rest }) {
  const auto = useId()
  const fid = id || 'c' + auto.replace(/:/g, '')
  return (
    <label className="check" htmlFor={fid}>
      <input id={fid} type="checkbox" checked={!!marcado} onChange={(e) => onMuda(e.target.checked)} {...rest} />
      <span>{children}</span>
    </label>
  )
}

export function Seg({ valor, onMuda, opcoes, rotulo }) {
  return (
    <div className="seg" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.valor} type="button" aria-pressed={valor === o.valor} onClick={() => onMuda(o.valor)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

export function Abas({ valor, onMuda, abas }) {
  return (
    <div className="tabs" role="tablist">
      {abas.map((a) => (
        <button key={a.valor} type="button" role="tab" aria-selected={valor === a.valor} onClick={() => onMuda(a.valor)}>
          {a.rotulo}
          {a.conta !== undefined && <span className="muted num"> {a.conta}</span>}
        </button>
      ))}
    </div>
  )
}

export function Aviso({ tipo = '', icone, children }) {
  const ic = icone || (tipo === 'bad' || tipo === 'warn' ? 'alerta' : 'info')
  return (
    <div className={'notice ' + tipo}>
      <Icon nome={ic} tamanho={17} />
      <div>{children}</div>
    </div>
  )
}

export function Vazio({ titulo, texto, children }) {
  return (
    <div className="empty">
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {children && <div className="actions">{children}</div>}
    </div>
  )
}

export function Dinheiro({ valor, className = '' }) {
  return <span className={'num ' + className}>{fmtBRL(valor)}</span>
}

export function KV({ rotulo, children }) {
  return (
    <div className="kv">
      <span>{rotulo}</span>
      <span>{children}</span>
    </div>
  )
}

export function Modal({ titulo, subtitulo, aberto, onFechar, children, rodape, largo }) {
  const ref = useRef(null)
  const fecharRef = useRef(onFechar)
  fecharRef.current = onFechar
  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') fecharRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      const foco = ref.current?.querySelector('.modal-body input, .modal-body select, .modal-body textarea, .modal-foot button')
      foco?.focus()
    }, 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
      if (anterior && document.contains(anterior)) anterior.focus?.()
    }
  }, [aberto])
  if (!aberto) return null
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar?.()}>
      <div className={'modal' + (largo ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <div className="modal-head">
          <div className="stack-sm">
            <h2>{titulo}</h2>
            {subtitulo && <p className="muted small">{subtitulo}</p>}
          </div>
          <Btn variante="ghost" icone="fechar" className="modal-x" aria-label="Fechar" onClick={onFechar} />
        </div>
        <div className="modal-body">{children}</div>
        {rodape && <div className="modal-foot">{rodape}</div>}
      </div>
    </div>
  )
}

// ---------- Confirmação dentro da página ----------
const ConfirmCtx = createContext(null)

export function ConfirmProvider({ children }) {
  const [pedido, setPedido] = useState(null)
  const confirmar = useCallback(
    (opcoes) =>
      new Promise((resolve) => {
        setPedido({ ...opcoes, resolve })
      }),
    [],
  )
  const fechar = (r) => {
    pedido?.resolve(r)
    setPedido(null)
  }
  return (
    <ConfirmCtx.Provider value={confirmar}>
      {children}
      <Modal
        aberto={!!pedido}
        titulo={pedido?.titulo || 'Confirmar'}
        onFechar={() => fechar(false)}
        rodape={
          <>
            <Btn onClick={() => fechar(false)}>{pedido?.cancelar || 'Voltar'}</Btn>
            <Btn variante={pedido?.perigo ? 'danger-solid' : 'primary'} onClick={() => fechar(true)}>
              {pedido?.acao || 'Confirmar'}
            </Btn>
          </>
        }
      >
        {pedido?.texto && <p>{pedido.texto}</p>}
      </Modal>
    </ConfirmCtx.Provider>
  )
}

export function useConfirmar() {
  return useContext(ConfirmCtx)
}

// ---------- Imagens ----------
export function Imagem({ id, alt = '', className, fallback }) {
  const url = useImagem(id)
  if (!url) return fallback || null
  return <img src={url} alt={alt} className={className} loading="lazy" />
}

export function Miniatura({ id, nome, tamanho = 44 }) {
  const url = useImagem(id)
  return (
    <div className="thumb layers-bg" style={{ width: tamanho, height: tamanho }}>
      {url ? <img src={url} alt="" /> : <span className="muted strong">{(nome || '?').trim().charAt(0).toUpperCase()}</span>}
    </div>
  )
}

export function SeletorArquivo({ aceitar = 'image/jpeg,image/png,image/webp', onArquivo, children, maxMB = 12, msgFormato = 'Formato não aceito. Use JPG, PNG ou WebP.' }) {
  const ref = useRef(null)
  const [sobre, setSobre] = useState(false)
  const [erro, setErro] = useState('')
  const tratar = (file) => {
    setErro('')
    if (!file) return
    if (aceitar && !aceitar.split(',').some((t) => file.type === t.trim() || (t.endsWith('/*') && file.type.startsWith(t.slice(0, -1))) || (t.startsWith('.') && file.name.toLowerCase().endsWith(t)))) {
      setErro(msgFormato)
      return
    }
    if (file.size > maxMB * 1024 * 1024) {
      setErro(`O arquivo passa de ${maxMB} MB.`)
      return
    }
    onArquivo(file)
  }
  return (
    <div className="stack-sm">
      <div
        className={'drop' + (sobre ? ' over' : '')}
        role="button"
        tabIndex={0}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ref.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setSobre(true)
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault()
          setSobre(false)
          tratar(e.dataTransfer.files?.[0])
        }}
      >
        {children}
        <input
          ref={ref}
          type="file"
          accept={aceitar}
          hidden
          onChange={(e) => {
            tratar(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {erro && <span className="err small bad-text">{erro}</span>}
    </div>
  )
}

export function Pill({ tipo = '', children, className = '' }) {
  return <span className={'pill ' + tipo + ' ' + className}>{children}</span>
}

export function Secao({ titulo, descricao, acoes, children, className = '' }) {
  return (
    <section className={'card ' + className}>
      {(titulo || acoes) && (
        <div className="card-head">
          <div>
            {titulo && <h3>{titulo}</h3>}
            {descricao && <p>{descricao}</p>}
          </div>
          {acoes && <div className="actions">{acoes}</div>}
        </div>
      )}
      <div className="stack">{children}</div>
    </section>
  )
}

export function Busca({ valor, onMuda, placeholder = 'Buscar', id }) {
  return (
    <div className="input-wrap prefix" style={{ minWidth: 0 }}>
      <input id={id} className="input" style={{ fontFamily: 'var(--font-body)' }} type="search" value={valor} placeholder={placeholder} onChange={(e) => onMuda(e.target.value)} aria-label={placeholder} />
      <span className="unit">
        <Icon nome="busca" tamanho={15} />
      </span>
    </div>
  )
}
