// Bancada 3D — cache para abrir rápido e funcionar com conexão instável.
const VERSAO = 'bancada3d-v3'
const BASE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const cdn = /cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.hostname)
  if (url.origin !== location.origin && !cdn) return
  if (req.mode === 'navigate') {
    // Página: tenta a rede (versão nova) e cai no cache se estiver offline.
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone()
          caches.open(VERSAO).then((c) => c.put('./index.html', copia))
          return r
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }
  // Arquivos e bibliotecas: cache primeiro, atualiza em segundo plano.
  e.respondWith(
    caches.match(req).then((emCache) => {
      const rede = fetch(req)
        .then((r) => {
          if (r && (r.ok || r.type === 'opaque')) {
            const copia = r.clone()
            caches.open(VERSAO).then((c) => c.put(req, copia))
          }
          return r
        })
        .catch(() => emCache)
      return emCache || rede
    }),
  )
})
