/**
 * PhotoGallery.tsx — Свайп-галерея на native touch events + CSS transitions.
 *
 * v3: Используем native addEventListener с { passive: false } вместо
 * React synthetic events. На iOS Safari/Telegram WebView, React touch events
 * являются passive — браузер может перехватить жест после первого свайпа.
 * Native non-passive listeners дают полный контроль через preventDefault().
 *
 * Карточка:
 *   - Горизонтальный свайп → листание (реалтайм)
 *   - Вертикальный → скролл страницы (не блокируем)
 *   - Тап → fullscreen
 *
 * Полноэкранный режим:
 *   - Горизонтальный свайп → листание
 *   - Вертикальный свайп → закрытие
 *   - Тап / ✕ → закрытие
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  photos: string[]
  alt?: string
  fallbackIcon: React.ReactNode
}

/** Минимум px для смены фото */
const SWIPE_PX = 50
/** Максимум px движения чтобы считать тапом */
const TAP_PX = 10
/** Минимум px вертикального свайпа для закрытия fullscreen */
const DISMISS_PX = 80
/** Минимум velocity (px/ms) для быстрого свайпа */
const VELOCITY_THRESHOLD = 0.5

/** Состояние touch жеста (mutable, в useRef) */
interface TouchState {
  startX: number
  startY: number
  dx: number
  dy: number
  active: boolean
  locked: boolean
  dir: 'h' | 'v' | null
  t0: number
}

const freshTouch = (): TouchState => ({
  startX: 0, startY: 0, dx: 0, dy: 0,
  active: false, locked: false, dir: null, t0: 0,
})

export default function PhotoGallery({ photos, alt = '', fallbackIcon }: Props) {
  /* ─── State ──────────────────────────────────────────── */
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  /* ─── Refs ───────────────────────────────────────────── */
  const galleryRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const fsOverlayRef = useRef<HTMLDivElement>(null)
  const fsStripRef = useRef<HTMLDivElement>(null)
  const gW = useRef(0)
  const touch = useRef(freshTouch())
  const fsTouch = useRef(freshTouch())

  /**
   * indexRef — зеркало React state `index` для native event listeners.
   * Native listeners привязываются один раз и не видят замыканий React.
   */
  const indexRef = useRef(0)
  useEffect(() => { indexRef.current = index }, [index])

  /** Кол-во фото в ref для native listeners */
  const countRef = useRef(photos.length)
  useEffect(() => { countRef.current = photos.length }, [photos.length])

  // ═══════════════════════════════════════════════════════════
  //  Утилиты
  // ═══════════════════════════════════════════════════════════

  /** Установить transform на DOM-элемент напрямую */
  const setTransform = useCallback((
    el: HTMLElement | null,
    x: number,
    y: number = 0,
    animated: boolean = false,
  ) => {
    if (!el) return
    el.style.transition = animated
      ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none'
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }, [])

  // ═══════════════════════════════════════════════════════════
  //  Замер ширины gallery
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const measure = () => {
      if (galleryRef.current) {
        gW.current = galleryRef.current.clientWidth
        // Мгновенно позиционируем strip
        setTransform(stripRef.current, -indexRef.current * gW.current)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [setTransform])

  /** Блокировка body scroll в fullscreen */
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  /** Sync card strip position при выходе из fullscreen */
  useEffect(() => {
    if (!fullscreen && gW.current > 0) {
      setTransform(stripRef.current, -indexRef.current * gW.current)
    }
  }, [fullscreen, setTransform])

  /** Sync fullscreen strip position при открытии */
  useEffect(() => {
    if (fullscreen) {
      requestAnimationFrame(() => {
        setTransform(fsStripRef.current, -indexRef.current * window.innerWidth)
      })
    }
  }, [fullscreen, setTransform])

  // ═══════════════════════════════════════════════════════════
  //  CARD GALLERY — native touch listeners
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const el = stripRef.current
    if (!el || photos.length <= 1) return

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      touch.current = {
        startX: t.clientX,
        startY: t.clientY,
        dx: 0, dy: 0,
        active: true,
        locked: false,
        dir: null,
        t0: Date.now(),
      }
      // Убираем transition для мгновенного следования за пальцем
      el.style.transition = 'none'
    }

    const onMove = (e: TouchEvent) => {
      const st = touch.current
      if (!st.active) return

      const t = e.touches[0]
      st.dx = t.clientX - st.startX
      st.dy = t.clientY - st.startY

      // Определяем направление при первом значимом движении
      if (!st.locked) {
        const ax = Math.abs(st.dx)
        const ay = Math.abs(st.dy)
        if (ax > 5 || ay > 5) {
          st.dir = ax >= ay ? 'h' : 'v'
          st.locked = true
        }
      }

      if (st.dir === 'h') {
        // КЛЮЧЕВОЙ МОМЕНТ: preventDefault блокирует системные жесты
        // (скролл, Telegram swipe-to-close, etc.)
        e.preventDefault()

        const idx = indexRef.current
        const cnt = countRef.current
        const w = gW.current

        // Elastic resistance на краях
        let dx = st.dx
        if ((idx === 0 && dx > 0) || (idx === cnt - 1 && dx < 0)) {
          dx = dx / 3
        }

        el.style.transform = `translate3d(${-idx * w + dx}px, 0, 0)`
      }
      // Если вертикальный — НЕ делаем preventDefault, браузер скроллит
    }

    const onEnd = () => {
      const st = touch.current
      if (!st.active) return
      st.active = false

      const idx = indexRef.current
      const cnt = countRef.current
      const w = gW.current

      // Тап → fullscreen
      if (Math.abs(st.dx) < TAP_PX && Math.abs(st.dy) < TAP_PX) {
        setFullscreen(true)
        return
      }

      // Вертикальный свайп → ничего (скролл уже обработан)
      if (st.dir === 'v') return

      // Velocity
      const elapsed = Date.now() - st.t0
      const vel = elapsed > 0 ? Math.abs(st.dx) / elapsed : 0

      // Определяем новый index
      let newIdx = idx
      if (st.dx > 0 && (st.dx > SWIPE_PX || vel > VELOCITY_THRESHOLD) && idx > 0) {
        newIdx = idx - 1
      } else if (st.dx < 0 && (Math.abs(st.dx) > SWIPE_PX || vel > VELOCITY_THRESHOLD) && idx < cnt - 1) {
        newIdx = idx + 1
      }

      // Animated snap
      setTransform(el, -newIdx * w, 0, true)
      if (newIdx !== idx) setIndex(newIdx)
    }

    // passive: false на touchmove — чтобы preventDefault() работал
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [photos.length, setTransform])

  // ═══════════════════════════════════════════════════════════
  //  FULLSCREEN — native touch listeners
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const el = fsStripRef.current
    if (!el || !fullscreen) return

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      fsTouch.current = {
        startX: t.clientX,
        startY: t.clientY,
        dx: 0, dy: 0,
        active: true,
        locked: false,
        dir: null,
        t0: Date.now(),
      }
      el.style.transition = 'none'
    }

    const onMove = (e: TouchEvent) => {
      const st = fsTouch.current
      if (!st.active) return

      const t = e.touches[0]
      st.dx = t.clientX - st.startX
      st.dy = t.clientY - st.startY

      if (!st.locked) {
        const ax = Math.abs(st.dx)
        const ay = Math.abs(st.dy)
        if (ax > 5 || ay > 5) {
          st.dir = ax >= ay ? 'h' : 'v'
          st.locked = true
        }
      }

      // В fullscreen блокируем ВСЕ жесты браузера
      e.preventDefault()

      const idx = indexRef.current
      const cnt = countRef.current
      const w = window.innerWidth

      if (st.dir === 'h') {
        let dx = st.dx
        if ((idx === 0 && dx > 0) || (idx === cnt - 1 && dx < 0)) {
          dx = dx / 3
        }
        el.style.transform = `translate3d(${-idx * w + dx}px, 0, 0)`
      } else if (st.dir === 'v') {
        // Вертикальный свайп → двигаем по Y + затемнение
        el.style.transform = `translate3d(${-idx * w}px, ${st.dy}px, 0)`
        const overlay = fsOverlayRef.current
        if (overlay) {
          const opacity = Math.max(0.3, 1 - Math.abs(st.dy) / 300)
          overlay.style.background = `rgba(0, 0, 0, ${opacity})`
        }
      }
    }

    const onEnd = () => {
      const st = fsTouch.current
      if (!st.active) return
      st.active = false

      const idx = indexRef.current
      const cnt = countRef.current
      const w = window.innerWidth

      // Тап → закрыть
      if (Math.abs(st.dx) < TAP_PX && Math.abs(st.dy) < TAP_PX) {
        setFullscreen(false)
        return
      }

      const elapsed = Date.now() - st.t0
      const vel = elapsed > 0 ? Math.abs(st.dx) / elapsed : 0
      const velY = elapsed > 0 ? Math.abs(st.dy) / elapsed : 0

      if (st.dir === 'h') {
        let newIdx = idx
        if (st.dx > 0 && (st.dx > SWIPE_PX || vel > VELOCITY_THRESHOLD) && idx > 0) {
          newIdx = idx - 1
        } else if (st.dx < 0 && (Math.abs(st.dx) > SWIPE_PX || vel > VELOCITY_THRESHOLD) && idx < cnt - 1) {
          newIdx = idx + 1
        }
        setTransform(el, -newIdx * w, 0, true)
        if (newIdx !== idx) setIndex(newIdx)
      } else if (st.dir === 'v') {
        if (Math.abs(st.dy) > DISMISS_PX || velY > VELOCITY_THRESHOLD) {
          setFullscreen(false)
        } else {
          // Snap back
          setTransform(el, -idx * w, 0, true)
          const overlay = fsOverlayRef.current
          if (overlay) overlay.style.background = ''
        }
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [fullscreen, setTransform])

  // ═══════════════════════════════════════════════════════════
  //  Рендер
  // ═══════════════════════════════════════════════════════════

  if (photos.length === 0) {
    return <div className="gallery-placeholder">{fallbackIcon}</div>
  }

  return (
    <>
      {/* Card gallery */}
      <div className="gallery" ref={galleryRef}>
        <div
          ref={stripRef}
          className="gallery-strip"
          /* Если одно фото — тап через onClick (touch listeners не привязаны) */
          onClick={photos.length === 1 ? () => setFullscreen(true) : undefined}
        >
          {photos.map((photo, i) => (
            <img
              key={i}
              src={photo}
              alt={i === 0 ? alt : ''}
              className="gallery-img"
              style={{ width: gW.current || '100%', flexShrink: 0 }}
              draggable={false}
            />
          ))}
        </div>

        {photos.length > 1 && (
          <div className="gallery-dots-below">
            {photos.map((_, i) => (
              <div key={i} className={`gallery-dot${i === index ? ' active' : ''}`} />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            className="gallery-fullscreen"
            ref={fsOverlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {photos.length > 1 && (
              <div className="gallery-fs-counter">{index + 1} / {photos.length}</div>
            )}
            <button className="gallery-fs-close" onClick={() => setFullscreen(false)}>✕</button>

            <div ref={fsStripRef} className="gallery-fs-strip">
              {photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={i === 0 ? alt : ''}
                  className="gallery-fs-img"
                  style={{ width: window.innerWidth, flexShrink: 0 }}
                  draggable={false}
                />
              ))}
            </div>

            {photos.length > 1 && (
              <div className="gallery-fs-dots">
                {photos.map((_, i) => (
                  <div key={i} className={`gallery-dot${i === index ? ' active' : ''}`} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
