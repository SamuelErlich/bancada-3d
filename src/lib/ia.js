// Geração de imagem do produto em outra cena, com a chave de API do próprio usuário.
// A chave fica só neste navegador (localStorage) e nunca vai para o banco de dados.
import { dentroDoClaude } from './storage.js'

const CHAVE_LOCAL = 'bancada3d.ia.chave'

export const PROVEDORES = [
  { valor: 'gemini', rotulo: 'Google Gemini (AI Studio)', modeloPadrao: 'gemini-2.5-flash-image', custo: 'cerca de US$ 0,04 por imagem' },
  { valor: 'openai', rotulo: 'OpenAI', modeloPadrao: 'gpt-image-1', custo: 'cerca de US$ 0,04 a 0,07 por imagem (qualidade média)' },
]

export function lerChave(provedor) {
  try {
    return localStorage.getItem(`${CHAVE_LOCAL}.${provedor}`) || ''
  } catch (e) {
    return ''
  }
}

export function gravarChave(provedor, chave) {
  try {
    if (chave) localStorage.setItem(`${CHAVE_LOCAL}.${provedor}`, chave)
    else localStorage.removeItem(`${CHAVE_LOCAL}.${provedor}`)
    return true
  } catch (e) {
    return false
  }
}

export function montarPrompt(descricao, cena) {
  return [
    'Create a photorealistic product photo for an online store.',
    `Use the attached photo as the exact reference for the product. Product description (Portuguese): "${descricao}".`,
    'Keep the product identical to the reference: same shape, proportions, colors, materials, surface texture (including 3D-printed layer lines) and details. Do not redesign it, do not change its colors, do not add or remove parts.',
    `Scene: ${cena}.`,
    'Composition: square 1:1 frame, product centered and fully visible, realistic scale for the scene, natural shadows and reflections consistent with the lighting.',
    'No text, no logos, no watermarks, no people and no other products competing for attention.',
  ].join('\n')
}

function separarDataUrl(dataUrl) {
  const [cab, dados] = dataUrl.split(',')
  return { mime: (cab.match(/data:([^;]+)/) || [])[1] || 'image/jpeg', base64: dados }
}

async function lerErro(resp) {
  try {
    const j = await resp.json()
    return j?.error?.message || j?.message || `Erro ${resp.status}`
  } catch (e) {
    return `Erro ${resp.status}`
  }
}

async function gerarGemini({ chave, modelo, prompt, foto }) {
  const { mime, base64 } = separarDataUrl(foto)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: base64 } }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  })
  if (!resp.ok) throw new Error(traduzirErro(await lerErro(resp), resp.status))
  const json = await resp.json()
  const partes = json?.candidates?.[0]?.content?.parts || []
  const img = partes.find((p) => p.inlineData || p.inline_data)
  if (!img) {
    const motivo = json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason
    const texto = partes.find((p) => p.text)?.text
    throw new Error(motivo ? `O provedor não gerou a imagem (${motivo}). Tente outra foto ou descrição.` : texto || 'O provedor não devolveu uma imagem. Tente de novo.')
  }
  const d = img.inlineData || img.inline_data
  return `data:${d.mimeType || d.mime_type || 'image/png'};base64,${d.data}`
}

async function gerarOpenAI({ chave, modelo, prompt, foto }) {
  const { mime, base64 } = separarDataUrl(foto)
  const bin = atob(base64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
  const form = new FormData()
  form.append('model', modelo)
  form.append('prompt', prompt)
  form.append('size', '1024x1024')
  form.append('quality', 'medium')
  form.append('image', new Blob([arr], { type: mime }), `produto.${ext}`)
  const resp = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}` },
    body: form,
  })
  if (!resp.ok) throw new Error(traduzirErro(await lerErro(resp), resp.status))
  const json = await resp.json()
  const b64 = json?.data?.[0]?.b64_json
  if (!b64) throw new Error('O provedor não devolveu uma imagem. Tente de novo.')
  return `data:image/png;base64,${b64}`
}

function traduzirErro(msg, status) {
  if (status === 401 || status === 403) return 'A chave da API foi recusada. Confira se ela está correta e ativa.'
  if (status === 429) return 'Limite de uso do provedor atingido. Espere um pouco ou confira o saldo da sua conta.'
  if (status === 400 && /model/i.test(msg)) return `O provedor não reconheceu o modelo. Confira o nome do modelo. (${msg})`
  return msg
}

export async function gerarImagem({ provedor, chave, modelo, descricao, cena, foto }) {
  if (dentroDoClaude()) {
    throw new Error('Aqui dentro do Claude o app não pode se conectar a serviços externos. Gere as imagens na versão instalada no seu domínio.')
  }
  if (!chave) throw new Error('Informe a chave da API do provedor.')
  const prompt = montarPrompt(descricao, cena)
  try {
    if (provedor === 'openai') return await gerarOpenAI({ chave, modelo, prompt, foto })
    return await gerarGemini({ chave, modelo, prompt, foto })
  } catch (e) {
    if (e instanceof TypeError) throw new Error('Não foi possível falar com o provedor. Confira sua conexão.')
    throw e
  }
}
