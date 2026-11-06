import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { copyFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Depois do build, copia o app pronto para ABRIR-O-APP.html (abre com dois cliques no computador).
function copiaParaAbrir() {
  return {
    name: 'copia-abrir-o-app',
    apply: 'build',
    closeBundle() {
      copyFileSync(new URL('./dist/index.html', import.meta.url), new URL('./ABRIR-O-APP.html', import.meta.url))
    },
  }
}

// App do iPhone/iPad: fontes locais (sem Google Fonts) e sem o zoom automático ao tocar nos campos.
function htmlDoApp() {
  return {
    name: 'html-do-app-ios',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace(/\s*<link rel="preconnect"[^>]*>/g, '')
          .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="/fontes/fontes.css" />')
          .replace('initial-scale=1, viewport-fit=cover', 'initial-scale=1, maximum-scale=1, viewport-fit=cover')
      },
    },
  }
}

// npm run build      → dist/index.html: um arquivo só, com tudo embutido (web, seu domínio e Claude).
// npm run build:ios  → www/: app do iPhone/iPad (Capacitor), com bibliotecas e fontes dentro do app.
export default defineConfig(({ mode }) => {
  const ios = mode === 'ios'
  return {
    base: './',
    esbuild: {
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      jsxInject: `import React from 'react'`,
    },
    resolve: {
      alias: {
        '@plataforma': fileURLToPath(new URL(ios ? './src/plataforma/ios.js' : './src/plataforma/web.js', import.meta.url)),
      },
    },
    publicDir: ios ? 'ios-recursos/publico' : 'public',
    build: ios
      ? { target: 'es2019', outDir: 'www', emptyOutDir: true, chunkSizeWarningLimit: 4000 }
      : { target: 'es2019', cssCodeSplit: false, assetsInlineLimit: 100000000, chunkSizeWarningLimit: 4000 },
    plugins: ios ? [htmlDoApp()] : [viteSingleFile({ removeViteModuleLoader: true }), copiaParaAbrir()],
  }
})
