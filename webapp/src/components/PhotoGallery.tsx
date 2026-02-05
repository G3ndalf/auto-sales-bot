/**
 * PhotoGallery.tsx — v4.1: scroll-snap + вертикальный dismiss.
 *
 * Карточка: CSS scroll-snap (браузер обрабатывает свайпы).
 * Фуллскрин: scroll-snap по горизонтали + native touch для
 * вертикального свайпа вниз → закрытие (двигаем overlay по Y).
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  photos: string[]
  alt?: string
  fallbackIcon: React.ReactNode
}

/** Минимум px вертикального свайпа для закрытия */
const DISMISS_PX = 80
/** Максимум px чтобы считать тапом */
const TAP_PX = 10

export default function PhotoGallery({ photos, alt = '', fallbackIcon }: Props) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  /* ─── Refs ───────────────────────────────────────────── */
  const scrollRef = useRef<HTMLDivElement>(null)
  const fsScrollRef = useRef<HTMLDivElement>(null)
  const fsOverlayRef = useRef<HTMLDivElement>(null)

  /** Флаг: был ли скролл (чтобы отличить тап от свайпа) */
  const didScroll = useRef(false)
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>()

  // ═══════════════════════════════════════════════════════════
  //  Card gallery: track index via scroll
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const el = scrollRef.current
    if (!el || photos.length <= 1) return

    let ticking = false

    const onScroll = () => {
      didScroll.current = true
      clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => { didScroll.current = false }, 200)

      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        const w = el.clientWidth
        if (w > 0) setIndex(Math.round(el.scrollLeft / w))
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      clearTimeout(scrollTimer.current)
    }
  }, [photos.length])

  /** Тап на карточке → fullscreen */
  const onCardClick = useCallback(() => {
    if (!didScroll.current) setFullscreen(true)
  }, [])

  // ═══════════════════════════════════════════════════════════
  //  Fullscreen: scroll-snap (горизонталь) + dismiss (вертикаль)
  // ═══════════════════════════════════════════════════════════

  /** Блокируем body scroll */
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  /** При открытии → скролл к текущему фото */
  useEffect(() => {
    if (fullscreen && fsScrollRef.current) {
      fsScrollRef.current.scrollLeft = index * window.innerWidth
    }
  }, [fullscreen, index])

  /** Отслеживаем index при горизонтальном скролле */
  useEffect(() => {
    const el = fsScrollRef.current
    if (!el || !fullscreen || photos.length <= 1) return

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        const w = el.clientWidth
        if (w > 0) setIndex(Math.round(el.scrollLeft / w))
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [fullscreen, photos.length])

  // ─── Вертикальный dismiss: native touch на fsScrollRef ────
  useEffect(() => {
    const el = fsScrollRef.current
    const overlay = fsOverlayRef.current
    if (!el || !overlay || !fullscreen) return

    let startX = 0
    let startY = 0
    let dx = 0
    let dy = 0
    let locked = false
    let dir: 'h' | 'v' | null = null
    let active = false

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      startX = t.clientX
      startY = t.clientY
      dx = 0; dy = 0
      locked = false; dir = null
      active = true
    }

    const onMove = (e: TouchEvent) => {
      if (!active) return
      const t = e.touches[0]
      dx = t.clientX - startX
      dy = t.clientY - startY

      // Определяем направление
      if (!locked) {
        const ax = Math.abs(dx)
        const ay = Math.abs(dy)
        if (ax > 8 || ay > 8) {
          dir = ay > ax ? 'v' : 'h'
          locked = true
        }
      }

      if (dir === 'v') {
        // Вертикальный свайп → двигаем overlay + fade
        e.preventDefault()
        el.style.transform = `translateY(${dy}px)`
        el.style.transition = 'none'
        const opacity = Math.max(0.2, 1 - Math.abs(dy) / 400)
        overlay.style.backgroundColor = `rgba(0, 0, 0, ${opacity * 0.96})`
      }
      // Горизонтальный → не мешаем scroll-snap
    }

    const onEnd = () => {
      if (!active) return
      active = false

      if (dir === 'v') {
        if (Math.abs(dy) > DISMISS_PX) {
          // Dismiss: анимируем уход + закрываем
          el.style.transition = 'transform 0.2s ease-out'
          el.style.transform = `translateY(${dy > 0 ? 300 : -300}px)`
          overlay.style.transition = 'background-color 0.2s ease-out'
          overlay.style.backgroundColor = 'rgba(0, 0, 0, 0)'
          setTimeout(() => setFullscreen(false), 200)
        } else {
          // Snap back
          el.style.transition = 'transform 0.2s ease-out'
          el.style.transform = 'translateY(0)'
          overlay.style.transition = 'background-color 0.2s ease-out'
          overlay.style.backgroundColor = ''
        }
      } else if (!dir || (Math.abs(dx) < TAP_PX && Math.abs(dy) < TAP_PX)) {
        // Тап → закрыть
        setFullscreen(false)
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
      // Reset стилей при cleanup
      el.style.transform = ''
      el.style.transition = ''
    }
  }, [fullscreen])

  // ─── Sync card scroll при выходе из fullscreen ────────────
  const prevFullscreen = useRef(fullscreen)
  useEffect(() => {
    if (prevFullscreen.current && !fullscreen && scrollRef.current) {
      scrollRef.current.scrollLeft = index * scrollRef.current.clientWidth
    }
    prevFullscreen.current = fullscreen
  }, [fullscreen, index])

  // ═══════════════════════════════════════════════════════════
  //  Render
  // ═══════════════════════════════════════════════════════════

  if (photos.length === 0) {
    return <div className="gallery-placeholder">{fallbackIcon}</div>
  }

  return (
    <>
      {/* Card Gallery */}
      <div ref={scrollRef} className="gallery-scroll" onClick={onCardClick}>
        {photos.map((photo, i) => (
          <img
            key={i}
            src={photo}
            alt={i === 0 ? alt : ''}
            className="gallery-scroll-img"
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

            <div ref={fsScrollRef} className="gallery-fs-scroll">
              {photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={i === 0 ? alt : ''}
                  className="gallery-fs-scroll-img"
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
