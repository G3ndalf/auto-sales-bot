/**
 * PhotoGallery.tsx — Галерея фотографий с поддержкой свайпов.
 *
 * Управление в карточке:
 * - Свайп влево/вправо → листание фото (с анимацией слайда)
 * - Тап по фото → полноэкранный просмотр
 * - Точки-индикаторы ПОД фото
 *
 * Управление в полноэкранном режиме:
 * - Свайп влево/вправо → листание фото
 * - Свайп вверх/вниз → закрытие полноэкранного режима
 * - Кнопка ✕ → закрытие
 * - Тап → закрытие
 *
 * Используем framer-motion drag API (не raw touch events) —
 * безопасно для iOS WebKit, без конфликтов с React.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  /** Массив URL фотографий (уже полные URL, не file_id) */
  photos: string[]
  /** Alt-текст для img */
  alt?: string
  /** Иконка-заглушка при отсутствии фото */
  fallbackIcon: React.ReactNode
}

/** Порог смещения (px) для срабатывания свайпа */
const SWIPE_OFFSET = 50
/** Порог скорости (px/s) для быстрого свайпа */
const SWIPE_VELOCITY = 300
/** Порог вертикального смещения для закрытия фуллскрина */
const VERTICAL_CLOSE = 80
/** Минимальное смещение, чтобы считать жест свайпом (а не тапом) */
const TAP_THRESHOLD = 10

/**
 * Варианты анимации слайда — направление зависит от custom (direction).
 * direction > 0: листаем вперёд (enter справа, exit влево)
 * direction < 0: листаем назад (enter слева, exit вправо)
 */
const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '25%' : '-25%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-25%' : '25%',
    opacity: 0,
  }),
}

export default function PhotoGallery({ photos, alt = '', fallbackIcon }: Props) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  /** Направление слайда: 1 = вперёд, -1 = назад */
  const [direction, setDirection] = useState(0)
  /** Флаг: был ли значимый drag (чтобы отличить свайп от тапа) */
  const didDrag = useRef(false)

  /** Блокируем скролл body в полноэкранном режиме */
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  const goPrev = useCallback(() => {
    setDirection(-1)
    setIndex(i => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setDirection(1)
    setIndex(i => Math.min(photos.length - 1, i + 1))
  }, [photos.length])

  /**
   * Обработчик окончания горизонтального свайпа.
   * Если смещение или скорость превышают порог — листаем фото.
   * Возвращает true если свайп сработал (для подавления тапа).
   */
  const handleHorizontalDragEnd = useCallback((_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    const { offset, velocity } = info

    if (offset.x > SWIPE_OFFSET || velocity.x > SWIPE_VELOCITY) {
      goPrev()
      didDrag.current = true
    } else if (offset.x < -SWIPE_OFFSET || velocity.x < -SWIPE_VELOCITY) {
      goNext()
      didDrag.current = true
    } else if (Math.abs(offset.x) > TAP_THRESHOLD) {
      // Был drag но не достаточный для свайпа — подавляем тап
      didDrag.current = true
    }

    // Сбрасываем флаг после обработки click
    requestAnimationFrame(() => { didDrag.current = false })
  }, [goPrev, goNext])

  /**
   * Обработчик окончания свайпа в полноэкранном режиме.
   * Горизонтальный свайп → листание, вертикальный → закрытие.
   * dragDirectionLock блокирует ось после начала жеста.
   */
  const handleFullscreenDragEnd = useCallback((_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    const { offset, velocity } = info
    const isHorizontal = Math.abs(offset.x) > Math.abs(offset.y)

    if (isHorizontal) {
      // Горизонтальный свайп → листание фото
      if (offset.x > SWIPE_OFFSET || velocity.x > SWIPE_VELOCITY) {
        goPrev()
      } else if (offset.x < -SWIPE_OFFSET || velocity.x < -SWIPE_VELOCITY) {
        goNext()
      }
    } else {
      // Вертикальный свайп → закрытие фуллскрина
      if (Math.abs(offset.y) > VERTICAL_CLOSE || Math.abs(velocity.y) > SWIPE_VELOCITY) {
        setFullscreen(false)
      }
    }

    // Любой значимый drag подавляет тап
    if (Math.abs(offset.x) > TAP_THRESHOLD || Math.abs(offset.y) > TAP_THRESHOLD) {
      didDrag.current = true
    }
    requestAnimationFrame(() => { didDrag.current = false })
  }, [goPrev, goNext])

  /* Если фото нет — показываем заглушку */
  if (photos.length === 0) {
    return <div className="gallery-placeholder">{fallbackIcon}</div>
  }

  return (
    <>
      {/* ─── Обычная галерея (в карточке) ─────────────────── */}
      <div className="gallery">
        <motion.div
          className="gallery-swipe-area"
          drag={photos.length > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleHorizontalDragEnd}
          onClick={() => {
            if (!didDrag.current) setFullscreen(true)
          }}
          style={{ touchAction: photos.length > 1 ? 'pan-y' : 'auto' }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.img
              key={index}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              src={photos[index]}
              alt={alt}
              className="gallery-img"
              draggable={false}
            />
          </AnimatePresence>
        </motion.div>

        {/* Точки-индикаторы ПОД фото */}
        {photos.length > 1 && (
          <div className="gallery-dots-below">
            {photos.map((_, i) => (
              <div
                key={i}
                className={`gallery-dot${i === index ? ' active' : ''}`}
              />
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
            {/* Счётчик фото */}
            {photos.length > 1 && (
              <div className="gallery-fs-counter">
                {index + 1} / {photos.length}
              </div>
            )}

            {/* Кнопка закрытия */}
            <button
              className="gallery-fs-close"
              onClick={() => setFullscreen(false)}
            >
              ✕
            </button>

            {/* Фото: свайп лево/право = листание, вверх/вниз = закрыть */}
            <motion.div
              className="gallery-fs-photo"
              drag
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
              dragElastic={0.3}
              onDragEnd={handleFullscreenDragEnd}
              onClick={() => {
                if (!didDrag.current) setFullscreen(false)
              }}
              style={{ touchAction: 'none' }}
            >
              <AnimatePresence mode="wait" custom={direction}>
                <motion.img
                  key={index}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  src={photos[index]}
                  alt={alt}
                  className="gallery-fs-img"
                  draggable={false}
                />
              </AnimatePresence>
            </motion.div>

            {/* Точки внизу */}
            {photos.length > 1 && (
              <div className="gallery-fs-dots">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={`gallery-dot${i === index ? ' active' : ''}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
