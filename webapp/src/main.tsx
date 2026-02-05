/**
 * main.tsx — Точка входа приложения.
 *
 * Включает:
 * 1. Глобальные обработчики ошибок (window.onerror, unhandledrejection)
 *    → Показывают ошибку прямо на экране (не только в консоли)
 * 2. ErrorBoundary — ловит ошибки рендера React
 * 3. BrowserRouter — SPA-навигация
 *
 * Telegram iOS WebView + React 18 production = молчаливые краши.
 * Этот файл гарантирует, что мы УВИДИМ любую ошибку.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import './index.css'

/**
 * Глобальный перехватчик ошибок.
 * Показывает красный баннер прямо в DOM — видно даже если React не загрузился.
 */
function showGlobalError(message: string, source?: string) {
  // Не показываем дубликаты
  if (document.getElementById('__global_error')) return

  const div = document.createElement('div')
  div.id = '__global_error'
  div.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: #dc2626; color: white; padding: 12px 16px;
    font-family: -apple-system, system-ui, monospace;
    font-size: 12px; line-height: 1.4; word-break: break-all;
  `
  // Безопасная сборка DOM без innerHTML (защита от XSS)
  const title = document.createElement('strong')
  title.textContent = '⚠️ JS Error:'
  div.appendChild(title)

  div.appendChild(document.createElement('br'))

  /** Сообщение об ошибке (textContent — не интерпретирует HTML) */
  const msgSpan = document.createElement('span')
  msgSpan.textContent = message
  div.appendChild(msgSpan)

  if (source) {
    div.appendChild(document.createElement('br'))
    const srcSmall = document.createElement('small')
    srcSmall.textContent = source
    div.appendChild(srcSmall)
  }

  div.appendChild(document.createElement('br'))

  const btn = document.createElement('button')
  btn.textContent = 'Обновить'
  btn.style.cssText = `
    margin-top:8px; padding:4px 12px; background:white; color:#dc2626;
    border:none; border-radius:4px; font-size:12px; cursor:pointer;
  `
  btn.onclick = () => location.reload()
  div.appendChild(btn)
  document.body.prepend(div)
}

// Ловим синхронные JS ошибки (синтаксис, TypeError, ReferenceError, etc.)
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[GlobalError]', message, source, lineno, colno, error)
  showGlobalError(
    String(message),
    source ? `${source}:${lineno}:${colno}` : undefined
  )
}

// Ловим необработанные Promise rejection
window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledRejection]', event.reason)
  showGlobalError(
    `Promise: ${event.reason?.message || event.reason || 'Unknown'}`,
    event.reason?.stack?.split('\n')[1]?.trim()
  )
})

// ─── Telegram WebApp: раскрыть на полный экран ───
try {
  window.Telegram?.WebApp?.expand()
} catch { /* ignore */ }

// ─── Рендер приложения ───
const rootEl = document.getElementById('root')

if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <App />
        </HashRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
} else {
  // Если даже #root не найден — совсем плохо
  showGlobalError('#root element not found in DOM')
}
