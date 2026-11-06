import { useEffect, useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Modal, Texto, Selecao } from './ui.jsx'
import { fmtTelefone, novoId, numeroWhats, soDigitos } from '../lib/format.js'

function vazio() {
  return { id: '', nome: '', whatsapp: '', email: '', observacao: '', arquivado: false }
}

export function ModalCliente({ aberto, onFechar, inicial, onSalvo, nomeInicial }) {
  const { api } = useStore()
  const toast = useToast()
  const [f, setF] = useState(vazio)
  const [tentou, setTentou] = useState(false)
  useEffect(() => {
    if (aberto) {
      setF(inicial ? { ...vazio(), ...inicial } : { ...vazio(), nome: nomeInicial || '' })
      setTentou(false)
    }
  }, [aberto, inicial, nomeInicial])
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const dig = soDigitos(f.whatsapp)
  const erros = {
    nome: !f.nome.trim() ? 'Informe o nome.' : f.nome.trim().length > 120 ? 'Até 120 caracteres.' : null,
    whatsapp: dig && !numeroWhats(f.whatsapp) ? 'Use DDD + número (ex.: 11 91234-5678).' : null,
    email: f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim()) ? 'Confira o e-mail.' : null,
  }
  const e = (k) => (tentou ? erros[k] : null)
  const salvar = () => {
    setTentou(true)
    if (Object.values(erros).some(Boolean)) return
    const doc = api.salvar('clientes', {
      ...f,
      id: f.id || novoId(),
      nome: f.nome.trim(),
      whatsapp: dig ? fmtTelefone(f.whatsapp) : '',
      email: f.email.trim(),
      observacao: f.observacao.trim(),
    })
    toast(inicial ? 'Cliente atualizado' : 'Cliente cadastrado')
    onSalvo?.(doc)
    onFechar()
  }
  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={inicial ? 'Editar cliente' : 'Novo cliente'}
      subtitulo="Só o nome é obrigatório. Com o WhatsApp você avisa o cliente a cada etapa do pedido."
      rodape={
        <>
          <Btn onClick={onFechar}>Cancelar</Btn>
          <Btn variante="primary" onClick={salvar}>
            Salvar cliente
          </Btn>
        </>
      }
    >
      <Texto rotulo="Nome" valor={f.nome} onMuda={(v) => set('nome', v)} erro={e('nome')} maxLength={120} />
      <div className="grid-2">
        <Texto rotulo="WhatsApp com DDD" valor={f.whatsapp} onMuda={(v) => set('whatsapp', v)} erro={e('whatsapp')} inputMode="tel" placeholder="(11) 91234-5678" />
        <Texto rotulo="E-mail" valor={f.email} onMuda={(v) => set('email', v)} erro={e('email')} inputMode="email" />
      </div>
      <Texto rotulo="Observação interna" multilinha valor={f.observacao} onMuda={(v) => set('observacao', v)} maxLength={1000} dica="Só você vê. Ex.: prefere retirar à tarde." />
    </Modal>
  )
}

/** Escolhe um cliente do cadastro ou digita um novo. Retorna { clienteId, clienteNome, clienteContato }. */
export function SeletorCliente({ valor, onMuda, erro, permitirLivre = true, rotulo = 'Cliente' }) {
  const { dados } = useStore()
  const [modal, setModal] = useState(false)
  const ativos = Object.values(dados.clientes)
    .filter((c) => !c.arquivado || c.id === valor.clienteId)
    .sort((a, b) => a.nome.localeCompare(b.nome))
  const modo = valor.clienteId ? valor.clienteId : valor.livre ? '__livre__' : ''
  return (
    <div className="stack-sm">
      <Selecao
        rotulo={rotulo}
        valor={modo}
        erro={erro}
        vazio="Escolha o cliente"
        onMuda={(v) => {
          if (v === '__novo__') return setModal(true)
          if (v === '__livre__') return onMuda({ clienteId: null, clienteNome: '', clienteContato: '', livre: true })
          const c = dados.clientes[v]
          if (c) onMuda({ clienteId: c.id, clienteNome: c.nome, clienteContato: c.whatsapp || c.email || '', livre: false })
        }}
        opcoes={[
          ...ativos.map((c) => ({ valor: c.id, rotulo: c.nome + (c.whatsapp ? ` · ${c.whatsapp}` : '') })),
          { valor: '__novo__', rotulo: '+ Cadastrar cliente aqui' },
          ...(permitirLivre ? [{ valor: '__livre__', rotulo: 'Digitar sem cadastrar' }] : []),
        ]}
      />
      {modo === '__livre__' && (
        <div className="grid-2">
          <Texto rotulo="Nome do cliente" valor={valor.clienteNome} onMuda={(v) => onMuda({ ...valor, clienteNome: v })} maxLength={120} />
          <Texto rotulo="Contato" valor={valor.clienteContato} onMuda={(v) => onMuda({ ...valor, clienteContato: v })} maxLength={200} placeholder="WhatsApp ou e-mail" />
        </div>
      )}
      <ModalCliente
        aberto={modal}
        onFechar={() => setModal(false)}
        onSalvo={(c) => onMuda({ clienteId: c.id, clienteNome: c.nome, clienteContato: c.whatsapp || c.email || '', livre: false })}
      />
    </div>
  )
}
