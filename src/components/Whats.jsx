import { useEffect, useState } from 'react'
import { Btn, Modal, Texto, Aviso } from './ui.jsx'
import Icon from './Icon.jsx'
import { linkWhats, numeroWhats } from '../lib/format.js'
import { copiarTexto } from '../lib/files.js'
import { useToast } from '../store.jsx'

/** Confere número e mensagem antes de abrir o WhatsApp. O envio é sempre manual. */
export default function ModalWhats({ aberto, onFechar, titulo = 'Mensagem pelo WhatsApp', numero, mensagem, aviso }) {
  const toast = useToast()
  const [num, setNum] = useState(numero || '')
  const [msg, setMsg] = useState(mensagem || '')
  useEffect(() => {
    if (aberto) {
      setNum(numero || '')
      setMsg(mensagem || '')
    }
  }, [aberto, numero, mensagem])
  const valido = !!numeroWhats(num)
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={titulo}
      subtitulo="Confira o número e a mensagem. O WhatsApp abre com o texto pronto e você toca em enviar."
      rodape={
        <>
          <Btn
            icone="copiar"
            onClick={async () => {
              const ok = await copiarTexto(msg)
              toast(ok ? 'Mensagem copiada' : 'Selecione o texto e copie manualmente', ok ? 'ok' : 'bad')
            }}
          >
            Copiar mensagem
          </Btn>
          <a className="btn primary" href={linkWhats(num, msg)} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(onFechar, 200)}>
            <Icon nome="whats" tamanho={17} /> Abrir WhatsApp
          </a>
        </>
      }
    >
      {aviso && <Aviso tipo="warn">{aviso}</Aviso>}
      <Texto rotulo="WhatsApp do cliente" valor={num} onMuda={setNum} inputMode="tel" placeholder="(11) 91234-5678" dica={!num ? 'Sem número, o WhatsApp abre para você escolher a conversa.' : valido ? 'Número no formato certo.' : 'Use DDD + número.'} />
      <Texto rotulo="Mensagem" multilinha valor={msg} onMuda={setMsg} rows={9} />
      <p className="tiny muted">Mudar a etapa não envia nada sozinho e o app não confirma se a mensagem foi entregue.</p>
    </Modal>
  )
}
