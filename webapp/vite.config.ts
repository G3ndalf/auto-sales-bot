import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * cacheBustPlugin — вставляет timestamp билда в HTML.
 *
 * 1. Заменяет __BUILD_TS__ на реальный timestamp (для inline-скрипта диагностики)
 * 2. Вставляет HTML-комментарий с build ID (для инспекции кэша)
 *
 * Заставляет Telegram iOS WebView перезагружать при каждом деплое.
 */
function cacheBustPlugin(): Plugin {
  return {
    name: 'cache-bust',
    transformIndexHtml(html) {
      const ts = String(Date.now())
      return html
        .replace('__BUILD_TS__', ts)
        .replace('</head>', `  <!-- build: ${ts} -->\n  </head>`)
    },
  }
}

export default defineConfig({
  plugins: [react(), cacheBustPlugin()],
})
