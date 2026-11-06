import { useState } from 'react'
import { useStore, useToast } from '../store.jsx'
import { Btn, Modal } from './ui.jsx'
import { precificar } from '../lib/pricing.js'
import { pdfCalculos } from '../lib/pdf.js'
import { xlsxCalculos } from '../lib/planilha.js'
import { baixarArquivo } from '../lib/files.js'
import { hojeISO } from '../lib/format.js'

/** Diálogo para exportar vários cálculos em PDF ou Excel (até 500 por vez). */
export default function ModalExportar({ aberto, onFechar, ids }) {
  const { dados, ctx } = useStore()
  const toast = useToast()
  const [gerando, setGerando] = useState('')
  const lista = ids
    .map((id) => dados.produtos[id])
    .filter(Boolean)
    .slice(0, 500)
    .map((produto) => ({ produto, res: precificar(produto, ctx) }))

  const gerar = async (tipo) => {
    setGerando(tipo)
    try {
      const blob = tipo === 'pdf' ? await pdfCalculos(lista, dados.config) : await xlsxCalculos(lista)
      const nome = `calculos-${hojeISO()}.${tipo === 'pdf' ? 'pdf' : 'xlsx'}`
      const r = await baixarArquivo(nome, blob)
      if (r === 'salvo') {
        toast(tipo === 'pdf' ? 'PDF pronto' : 'Planilha pronta')
        onFechar()
      }
    } catch (e) {
      toast(e.message || 'Não foi possível exportar.', 'bad')
    } finally {
      setGerando('')
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Exportar cálculos"
      subtitulo={`${lista.length} ${lista.length === 1 ? 'item selecionado' : 'itens selecionados'}${ids.length > 500 ? ' (limite de 500 por exportação)' : ''}.`}
      rodape={<Btn onClick={onFechar}>Fechar</Btn>}
    >
      <div className="grid-2">
        <button type="button" className="list-item" onClick={() => gerar('pdf')} disabled={!!gerando || !lista.length}>
          <div className="grow stack-sm" style={{ gap: 2 }}>
            <span className="strong">{gerando === 'pdf' ? 'Gerando PDF…' : 'PDF do cálculo'}</span>
            <span className="small muted">Ficha de custo com composição e preço por canal. É interno: para o cliente, crie um orçamento.</span>
          </div>
        </button>
        <button type="button" className="list-item" onClick={() => gerar('xlsx')} disabled={!!gerando || !lista.length}>
          <div className="grow stack-sm" style={{ gap: 2 }}>
            <span className="strong">{gerando === 'xlsx' ? 'Gerando planilha…' : 'Excel (planilha)'}</span>
            <span className="small muted">Uma linha por produto, com custos, preços, lucro, margem e preço em cada canal.</span>
          </div>
        </button>
      </div>
    </Modal>
  )
}
