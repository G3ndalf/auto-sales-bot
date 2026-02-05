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

    if (!tg) return

    if (isHome) {
      tg.BackButton.hide()
      return
    }

    tg.BackButton.show()

    const handler = () => {
      if (fallbackPath) {
        navigate(fallbackPath)
      } else {
        navigate(-1)
      }
    }

    tg.BackButton.onClick(handler)

    return () => {
      tg.BackButton.offClick(handler)
      tg.BackButton.hide()
    }
  }, [isHome, navigate, fallbackPath])
}
