import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite config для Авто СКФО Mini App.
 *
 * cacheBustPlugin — вставляет HTML-комментарий с timestamp билда
 * в dist/index.html. Это заставляет Telegram iOS WebView
 * перезагружать страницу, потому что содержимое HTML меняется
 * при каждом билде (даже если код не изменился).
 */
function cacheBustPlugin() {
  return {
    name: 'cache-bust',
    closeBundle() {
      // Добавляем timestamp в собранный index.html после билда
      const fs = require('fs')
      const path = require('path')
      const htmlPath = path.resolve(__dirname, 'dist/index.html')
      if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf-8')
        const buildId = `<!-- build: ${Date.now()} -->`
        html = html.replace('</head>', `${buildId}\n</head>`)
        fs.writeFileSync(htmlPath, html)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), cacheBustPlugin()],
})
