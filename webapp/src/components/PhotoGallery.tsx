/**
 * PhotoGallery.tsx — Карусельная галерея с плавным свайпом.
 *
 * Все фото рендерятся в горизонтальной ленте (strip). Свайп двигает
 * ленту в реальном времени через useMotionValue. Анимация snap-to-photo
 * вызывается ТОЛЬКО в onDragEnd (не в useEffect — избегаем конфликтов).
 *
 * Карточка:
 * - Горизонтальный свайп → листание (реал-тайм)
 * - Тап → полноэкранный просмотр
 * - touchAction: pan-y — вертикальный скролл не блокируется
 *
 * Полноэкранный режим:
 * - Горизонтальный свайп → листание (dragDirectionLock)
 * - Вертикальный свайп → закрытие
 * - Тап / кнопка ✕ → закрытие
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'

interface Props {
  photos: string[]
  alt?: string
  fallbackIcon: React.ReactNode
}

const SWIPE_RATIO = 0.2
const SWIPE_VEL = 300
const DISMISS_PX = 80
const TAP_PX = 10

/** Spring-конфиг для snap-анимации */
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 }

export default function PhotoGallery({ photos, alt = '', fallbackIcon }: Props) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const didDrag = useRef(false)

  // ─── Card gallery ─────────────────────────────────────────
  const galleryRef = useRef<HTMLDivElement>(null)
  const [gW, setGW] = useState(0)
  const gX = useMotionValue(0)

  // ─── Fullscreen ───────────────────────────────────────────
  const fsX = useMotionValue(0)
  const fsY = useMotionValue(0)

  /** Замер ширины контейнера */
  useEffect(() => {
    const measure = () => {
      if (galleryRef.current) setGW(galleryRef.current.clientWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  /**
   * Позиция карточной ленты — устанавливается instant (без анимации):
   * - При первом замере gW
   * - При ресайзе окна
   * - При закрытии фуллскрина (синхронизация с index)
   * Анимация свайпа — ТОЛЬКО в onDragEnd, не здесь.
   */
  useEffect(() => {
    if (gW > 0) {
      gX.set(-index * gW)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gW, fullscreen])

  /** При открытии фуллскрина — позиция instant */
  useEffect(() => {
    if (fullscreen) {
      fsX.set(-index * window.innerWidth)
      fsY.set(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen])

  /** Блокировка скролла body в фуллскрине */
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  // ─── Card drag end ────────────────────────────────────────
  const onCardDragEnd = useCallback((_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (!gW) return
    const t = gW * SWIPE_RATIO
    let newIdx = index

    if ((info.offset.x > t || info.velocity.x > SWIPE_VEL) && index > 0) {
      newIdx = index - 1
      didDrag.current = true
    } else if ((info.offset.x < -t || info.velocity.x < -SWIPE_VEL) && index < photos.length - 1) {
      newIdx = index + 1
      didDrag.current = true
    }

    // Всегда анимируем к целевой позиции (snap back или к новому фото)
    animate(gX, -newIdx * gW, SPRING)
    if (newIdx !== index) setIndex(newIdx)

    if (Math.abs(info.offset.x) > TAP_PX) didDrag.current = true
    requestAnimationFrame(() => { didDrag.current = false })
  }, [gW, index, photos.length])

  // ─── Fullscreen drag end ──────────────────────────────────
  const onFsDragEnd = useCallback((_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    const w = window.innerWidth
    const isH = Math.abs(info.offset.x) > Math.abs(info.offset.y)

    if (isH) {
      const t = w * SWIPE_RATIO
      let newIdx = index

      if ((info.offset.x > t || info.velocity.x > SWIPE_VEL) && index > 0) {
        newIdx = index - 1
      } else if ((info.offset.x < -t || info.velocity.x < -SWIPE_VEL) && index < photos.length - 1) {
        newIdx = index + 1
      }

      animate(fsX, -newIdx * w, SPRING)
      if (newIdx !== index) setIndex(newIdx)
    } else {
      // Вертикальный свайп → закрытие или snap back
      if (Math.abs(info.offset.y) > DISMISS_PX || Math.abs(info.velocity.y) > SWIPE_VEL) {
        setFullscreen(false)
      } else {
        animate(fsY, 0, SPRING)
      }
    }

    if (Math.abs(info.offset.x) > TAP_PX || Math.abs(info.offset.y) > TAP_PX) {
      didDrag.current = true
    }
    requestAnimationFrame(() => { didDrag.current = false })
  }, [index, photos.length])

  if (photos.length === 0) {
    return <div className="gallery-placeholder">{fallbackIcon}</div>
  }

  return (
    <>
      {/* ─── Карточка ────────────────────────────────────── */}
      <div className="gallery" ref={galleryRef}>
        <motion.div
          className="gallery-strip"
          drag={photos.length > 1 ? 'x' : false}
          dragMomentum={false}
          dragElastic={0.15}
          dragConstraints={{ left: -(photos.length - 1) * gW, right: 0 }}
          style={{ x: gX, touchAction: photos.length > 1 ? 'pan-y' : 'auto' }}
          onDragEnd={onCardDragEnd}
          onClick={() => { if (!didDrag.current) setFullscreen(true) }}
        >
          {photos.map((photo, i) => (
            <img
              key={i}
              src={photo}
              alt={i === 0 ? alt : ''}
              className="gallery-img"
              style={{ width: gW || '100%', flexShrink: 0 }}
              draggable={false}
            />
          ))}
        </motion.div>

        {photos.length > 1 && (
          <div className="gallery-dots-below">
            {photos.map((_, i) => (
              <div key={i} className={`gallery-dot${i === index ? ' active' : ''}`} />
            ))}
          </div>
        )}
      </div>

      {/* ─── Полноэкранный просмотр ──────────────────────── */}
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

            <motion.div
              className="gallery-fs-strip"
              drag
              dragDirectionLock
              dragMomentum={false}
              dragElastic={{ left: 0.15, right: 0.15, top: 0.7, bottom: 0.7 }}
              dragConstraints={{
                left: -(photos.length - 1) * window.innerWidth,
                right: 0,
                top: 0,
                bottom: 0,
              }}
              style={{ x: fsX, y: fsY, touchAction: 'none' }}
              onDragEnd={onFsDragEnd}
              onClick={() => { if (!didDrag.current) setFullscreen(false) }}
            >
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
            </motion.div>

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
