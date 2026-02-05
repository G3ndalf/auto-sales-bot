/**
 * useBackButton — Хук для управления BackButton в Telegram Mini App.
 *
 * Все вызовы Telegram SDK обёрнуты в try-catch:
 * - BackButton может быть не поддержан в текущей версии WebApp
 * - SDK может выбросить исключение вместо предупреждения
 * - Вне Telegram (обычный браузер) — graceful fallback
 *
 * @param fallbackPath — путь для навигации при нажатии BackButton.
 *   Если не указан, используется navigate(-1) (browser history back).
 */

import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        BackButton: {
          show: () => void
          hide: () => void
          onClick: (cb: () => void) => void
          offClick: (cb: () => void) => void
        }
        sendData: (data: string) => void
        close: () => void
        isClosingConfirmationEnabled?: boolean
        enableClosingConfirmation?: () => void
        disableClosingConfirmation?: () => void
        MainButton: {
          setText: (text: string) => void
          show: () => void
          hide: () => void
          onClick: (cb: () => void) => void
          offClick: (cb: () => void) => void
        }
        initData?: string
        initDataUnsafe?: {
          user?: {
            id: number
          }
        }
      }
    }
  }
}

export function useBackButton(fallbackPath?: string) {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.BackButton) return

    if (isHome) {
      try { tg.BackButton.hide() } catch { /* ignore */ }
      return
    }

    try { tg.BackButton.show() } catch { /* ignore */ }

    const handler = () => {
      if (fallbackPath) {
        navigate(fallbackPath)
      } else {
        navigate(-1)
      }
    }

    try { tg.BackButton.onClick(handler) } catch { /* ignore */ }

    return () => {
      try { tg.BackButton.offClick(handler) } catch { /* ignore */ }
      try { tg.BackButton.hide() } catch { /* ignore */ }
    }
  }, [isHome, navigate, fallbackPath])
}
