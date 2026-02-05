/**
 * PhotoGallery.tsx — Карусельная галерея с плавным свайпом.
 *
 * Все фото рендерятся в горизонтальной ленте (strip), свайп двигает
 * ленту в реальном времени (без задержки на AnimatePresence).
 *
 * Карточка:
 * - Горизонтальный свайп → листание фото (реал-тайм)
 * - Тап → полноэкранный просмотр
 * - touchAction: pan-y — вертикальный скролл страницы не блокируется
 *
 * Полноэкранный режим:
 * - Горизонтальный свайп → листание (dragDirectionLock)
 * - Вертикальный свайп → закрытие
 * - Тап / кнопка ✕ → закрытие
 *
 * Используем framer-motion useMotionValue + animate для плавности.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'

interface Props {
  photos: string[]
  alt?: string
  fallbackIcon: React.ReactNode
}

/** Порог свайпа: 20% ширины контейнера */
const SWIPE_RATIO = 0.2
/** Порог скорости свайпа (px/s) */
const SWIPE_VEL = 300
/** Порог вертикального смещения для закрытия фуллскрина (px) */
const DISMISS_PX = 80
/** Максимальное смещение, чтобы считать жест тапом (px) */
const TAP_PX = 10

export default function PhotoGallery({ photos, alt = '', fallbackIcon }: Props) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  /** Флаг: был drag (для подавления onClick после свайпа) */
  const didDrag = useRef(false)

  // ─── Card gallery: горизонтальная лента ───────────────────
  const galleryRef = useRef<HTMLDivElement>(null)
  const [gW, setGW] = useState(0)
  const gX = useMotionValue(0)

  // ─── Fullscreen: горизонтальная лента + вертикальный dismiss ─
  const fsX = useMotionValue(0)
  const fsY = useMotionValue(0)
  const wasFs = useRef(false)

  /** Замер ширины контейнера галереи */
  useEffect(() => {
    const measure = () => {
      if (galleryRef.current) setGW(galleryRef.current.clientWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  /** Анимация ленты карточки при смене index */
  useEffect(() => {
    if (gW > 0) {
      animate(gX, -index * gW, { type: 'spring', stiffness: 300, damping: 30 })
    }
  }, [index, gW])

  /** Fullscreen: позиция ленты (instant при открытии, animate при свайпе) */
  useEffect(() => {
    if (fullscreen) {
      const w = window.innerWidth
      if (!wasFs.current) {
        // Только что открыли — позиция без анимации
        fsX.set(-index * w)
        fsY.set(0)
        wasFs.current = true
      } else {
        // Уже в фуллскрине, index изменился — плавная анимация
        animate(fsX, -index * w, { type: 'spring', stiffness: 300, damping: 30 })
      }
    } else {
      wasFs.current = false
    }
  }, [index, fullscreen])

  /** Блокировка скролла body в фуллскрине */
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  // ─── Card: обработчик окончания свайпа ────────────────────
  const onCardDragEnd = useCallback((_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (!gW) return
    const t = gW * SWIPE_RATIO

    if ((info.offset.x > t || info.velocity.x > SWIPE_VEL) && index > 0) {
      setIndex(i => i - 1)
      didDrag.current = true
    } else if ((info.offset.x < -t || info.velocity.x < -SWIPE_VEL) && index < photos.length - 1) {
      setIndex(i => i + 1)
      didDrag.current = true
    } else {
      // Не дотянул — snap back к текущему фото
      animate(gX, -index * gW, { type: 'spring', stiffness: 300, damping: 30 })
    }

    if (Math.abs(info.offset.x) > TAP_PX) didDrag.current = true
    requestAnimationFrame(() => { didDrag.current = false })
  }, [gW, index, photos.length])

  // ─── Fullscreen: обработчик окончания свайпа ──────────────
  const onFsDragEnd = useCallback((_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    const w = window.innerWidth
    const isH = Math.abs(info.offset.x) > Math.abs(info.offset.y)

    if (isH) {
      // Горизонтальный свайп → листание
      const t = w * SWIPE_RATIO
      if ((info.offset.x > t || info.velocity.x > SWIPE_VEL) && index > 0) {
        setIndex(i => i - 1)
      } else if ((info.offset.x < -t || info.velocity.x < -SWIPE_VEL) && index < photos.length - 1) {
        setIndex(i => i + 1)
      } else {
        animate(fsX, -index * w, { type: 'spring', stiffness: 300, damping: 30 })
      }
    } else {
      // Вертикальный свайп → закрытие или snap back
      if (Math.abs(info.offset.y) > DISMISS_PX || Math.abs(info.velocity.y) > SWIPE_VEL) {
        setFullscreen(false)
      } else {
        animate(fsY, 0, { type: 'spring', stiffness: 300, damping: 30 })
      }
    }

    if (Math.abs(info.offset.x) > TAP_PX || Math.abs(info.offset.y) > TAP_PX) {
      didDrag.current = true
    }
    requestAnimationFrame(() => { didDrag.current = false })
  }, [index, photos.length])

  /* Пустая галерея — заглушка */
  if (photos.length === 0) {
    return <div className="gallery-placeholder">{fallbackIcon}</div>
  }

  return (
    <>
      {/* ─── Карточка: горизонтальная лента фото ─────────── */}
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

        {/* Точки-индикаторы ПОД фото */}
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
            {/* Счётчик */}
            {photos.length > 1 && (
              <div className="gallery-fs-counter">{index + 1} / {photos.length}</div>
            )}

            {/* Кнопка закрытия */}
            <button className="gallery-fs-close" onClick={() => setFullscreen(false)}>✕</button>

            {/* Лента фото: dragDirectionLock разделяет горизонт/вертикаль */}
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

            {/* Точки */}
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
