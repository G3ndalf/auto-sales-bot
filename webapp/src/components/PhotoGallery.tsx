/**
 * PhotoGallery.tsx — Компонент галереи фотографий для карточек объявлений.
 *
 * Управление:
 * - Нажатие на левые 30% фото → предыдущее фото
 * - Нажатие на правые 30% фото → следующее фото
 * - Нажатие на центральные 40% фото → полноэкранный просмотр
 * - В полноэкранном режиме те же зоны: лево/право листают, центр закрывает
 * - Кнопка ✕ в правом верхнем углу полноэкранного режима
 * - Точки-индикаторы ПОД фото (не поверх)
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  /** Массив URL фотографий (уже полные URL, не file_id) */
  photos: string[]
  /** Alt-текст для img */
  alt?: string
  /** Иконка-заглушка при отсутствии фото */
  fallbackIcon: React.ReactNode
}

export default function PhotoGallery({ photos, alt = '', fallbackIcon }: Props) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  /** Блокируем скролл body в полноэкранном режиме */
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIndex(i => Math.min(photos.length - 1, i + 1)), [photos.length])

  /**
   * Определяет зону нажатия и выполняет соответствующее действие.
   * Три зоны: левые 30% (prev), центр 40% (centerAction), правые 30% (next).
   * Если фото одно — любое нажатие = centerAction.
   */
  const handleTap = useCallback((
    e: React.MouseEvent<HTMLDivElement>,
    centerAction: () => void,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = x / rect.width

    if (photos.length <= 1) {
      centerAction()
    } else if (ratio < 0.3) {
      prev()
    } else if (ratio > 0.7) {
      next()
    } else {
      centerAction()
    }
  }, [photos.length, prev, next])

  /* Если фото нет — показываем заглушку */
  if (photos.length === 0) {
    return <div className="gallery-placeholder">{fallbackIcon}</div>
  }

  return (
    <>
      {/* ─── Обычная галерея ──────────────────────────────── */}
      <div className="gallery">
        <div
          className="gallery-tap-area"
          onClick={(e) => handleTap(e, () => setFullscreen(true))}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={index}
              src={photos[index]}
              alt={alt}
              className="gallery-img"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              draggable={false}
            />
          </AnimatePresence>
        </div>

        {/* Точки-индикаторы ПОД фото (не поверх) */}
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
            {/* Счётчик фото сверху по центру */}
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

            {/* Фото с зонами нажатия: лево/центр/право */}
            <div
              className="gallery-fs-photo"
              onClick={(e) => handleTap(e, () => setFullscreen(false))}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={index}
                  src={photos[index]}
                  alt={alt}
                  className="gallery-fs-img"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  draggable={false}
                />
              </AnimatePresence>
            </div>

            {/* Точки внизу полноэкранного режима */}
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
