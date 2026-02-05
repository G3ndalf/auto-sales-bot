import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * cacheBustPlugin — вставляет timestamp билда в HTML.
 * Заставляет Telegram iOS WebView перезагружать при каждом деплое.
 */
function cacheBustPlugin(): Plugin {
  return {
    name: 'cache-bust',
    transformIndexHtml(html) {
      // Вставляем timestamp прямо в HTML при сборке
      const buildId = `<!-- build: ${Date.now()} -->`
      return html.replace('</head>', `  ${buildId}\n  </head>`)
    },
  }
}

export default defineConfig({
  plugins: [react(), cacheBustPlugin()],
})
