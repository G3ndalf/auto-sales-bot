/**
 * PhotoGallery.tsx — v4: нативный scroll-snap.
 *
 * Предыдущие подходы (framer-motion drag, React touch events,
 * native touch listeners) зависали после первого свайпа в iOS
 * Telegram WebView. Проблема в конфликте JS touch handling
 * с WebView gesture system.
 *
 * Решение: CSS scroll-snap. Браузер обрабатывает ВСЕ свайпы нативно.
 * JS только отслеживает текущий index через scroll event.
 *
 * Карточка: overflow-x scroll + scroll-snap-type: x mandatory
 * Фуллскрин: тот же scroll-snap + тап/кнопка для закрытия
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  photos: string[]
  alt?: string
  fallbackIcon: React.ReactNode
}

export default function PhotoGallery({ photos, alt = '', fallbackIcon }: Props) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  /* ─── Refs ───────────────────────────────────────────── */
  const scrollRef = useRef<HTMLDivElement>(null)
  const fsScrollRef = useRef<HTMLDivElement>(null)

  /**
   * Флаг: был ли скролл между touchstart и click.
   * Нужен чтобы отличить тап от свайпа для открытия fullscreen.
   */
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

      // Debounce: сбрасываем флаг через 200ms после остановки скролла
      clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => {
        didScroll.current = false
      }, 200)

      if (ticking) return
      ticking = true

      requestAnimationFrame(() => {
        ticking = false
        const w = el.clientWidth
        if (w > 0) {
          const newIdx = Math.round(el.scrollLeft / w)
          setIndex(newIdx)
        }
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      clearTimeout(scrollTimer.current)
    }
  }, [photos.length])

  /** Тап на фото → fullscreen (если не было свайпа) */
  const onCardClick = useCallback(() => {
    if (!didScroll.current) {
      setFullscreen(true)
    }
  }, [])

  // ═══════════════════════════════════════════════════════════
  //  Fullscreen
  // ═══════════════════════════════════════════════════════════

  /** Блокируем body scroll в fullscreen */
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  /** При открытии fullscreen — скроллим к текущему фото */
  useEffect(() => {
    if (fullscreen && fsScrollRef.current) {
      const w = window.innerWidth
      fsScrollRef.current.scrollLeft = index * w
    }
  }, [fullscreen, index])

  /** Fullscreen: отслеживаем index */
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
        if (w > 0) {
          const newIdx = Math.round(el.scrollLeft / w)
          setIndex(newIdx)
        }
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [fullscreen, photos.length])

  /** Тап на фото в fullscreen → закрыть */
  const fsTapRef = useRef(false)
  const onFsPointerDown = useCallback(() => { fsTapRef.current = true }, [])
  const onFsScroll = useCallback(() => { fsTapRef.current = false }, [])
  const onFsClick = useCallback(() => {
    if (fsTapRef.current) setFullscreen(false)
  }, [])

  // ═══════════════════════════════════════════════════════════
  //  Sync card scroll position при выходе из fullscreen
  // ═══════════════════════════════════════════════════════════

  const prevFullscreen = useRef(fullscreen)
  useEffect(() => {
    // При закрытии fullscreen — скроллим card gallery к текущему фото
    if (prevFullscreen.current && !fullscreen && scrollRef.current) {
      const w = scrollRef.current.clientWidth
      scrollRef.current.scrollLeft = index * w
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
      {/* ─── Card Gallery ────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="gallery-scroll"
        onClick={onCardClick}
      >
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

      {/* ─── Fullscreen ──────────────────────────────────── */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            className="gallery-fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {photos.length > 1 && (
              <div className="gallery-fs-counter">{index + 1} / {photos.length}</div>
            )}
            <button className="gallery-fs-close" onClick={() => setFullscreen(false)}>✕</button>

            <div
              ref={fsScrollRef}
              className="gallery-fs-scroll"
              onPointerDown={onFsPointerDown}
              onScroll={onFsScroll}
              onClick={onFsClick}
            >
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
