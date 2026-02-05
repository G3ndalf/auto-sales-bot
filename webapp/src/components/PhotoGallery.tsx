/**
 * PhotoGallery.tsx — Свайп-галерея на CSS transitions + touch events.
 *
 * Предыдущая версия на framer-motion drag зависала после первого свайпа
 * (конфликт animate() и drag gesture на iOS WebKit). Эта версия использует
 * только CSS transform + transition для анимации, и raw touch events для
 * отслеживания свайпа. Framer-motion остаётся только для AnimatePresence
 * (fade in/out fullscreen overlay).
 *
 * Карточка:
 *   - Горизонтальный свайп → листание (реалтайм, палец двигает ленту)
 *   - Тап (< 10px движения) → полноэкранный просмотр
 *   - touchAction: pan-y — вертикальный скролл страницы не блокируется
 *
 * Полноэкранный режим:
 *   - Горизонтальный свайп → листание
 *   - Вертикальный свайп (> 80px) → закрытие
 *   - Тап / кнопка ✕ → закрытие
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  photos: string[]
  alt?: string
  fallbackIcon: React.ReactNode
}

/** Порог свайпа: минимум пикселей для переключения фото */
const SWIPE_PX = 50
/** Порог тапа: если палец сдвинулся меньше — считаем тапом */
const TAP_PX = 10
/** Порог вертикального свайпа для закрытия fullscreen */
const DISMISS_PX = 80

/**
 * Состояние touch-жеста. Хранится в useRef чтобы не вызывать
 * лишние ре-рендеры при каждом touchmove.
 */
interface TouchState {
  /** Начальная X-координата касания */
  startX: number
  /** Начальная Y-координата касания */
  startY: number
  /** Текущее смещение по X от начала */
  dx: number
  /** Текущее смещение по Y от начала */
  dy: number
  /** Флаг: палец сейчас на экране */
  active: boolean
  /** Определили ли мы направление жеста (H или V) */
  directionLocked: boolean
  /** 'h' = горизонтальный, 'v' = вертикальный */
  direction: 'h' | 'v' | null
  /** Timestamp начала жеста — для velocity */
  startTime: number
}

const INITIAL_TOUCH: TouchState = {
  startX: 0, startY: 0, dx: 0, dy: 0,
  active: false, directionLocked: false, direction: null, startTime: 0,
}

export default function PhotoGallery({ photos, alt = '', fallbackIcon }: Props) {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)

  /* ─── Card gallery refs ────────────────────────────────── */
  const galleryRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const [gW, setGW] = useState(0)
  const touch = useRef<TouchState>({ ...INITIAL_TOUCH })

  /* ─── Fullscreen refs ──────────────────────────────────── */
  const fsStripRef = useRef<HTMLDivElement>(null)
  const fsTouch = useRef<TouchState>({ ...INITIAL_TOUCH })

  /** Замер ширины card-контейнера */
  useEffect(() => {
    const measure = () => {
      if (galleryRef.current) setGW(galleryRef.current.clientWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  /** Блокируем скролл body в fullscreen */
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  /**
   * Применяет transform к strip-элементу.
   * @param ref - ref на strip div
   * @param x - горизонтальное смещение (px)
   * @param y - вертикальное смещение (px), только для fullscreen
   * @param animated - использовать CSS transition или нет
   */
  const applyTransform = useCallback((
    ref: React.RefObject<HTMLDivElement | null>,
    x: number,
    y: number = 0,
    animated: boolean = false,
  ) => {
    if (!ref.current) return
    ref.current.style.transition = animated
      ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none'
    ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
  }, [])

  // ═══════════════════════════════════════════════════════════
  //  CARD GALLERY — touch handlers
  // ═══════════════════════════════════════════════════════════

  const onCardTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    touch.current = {
      startX: t.clientX,
      startY: t.clientY,
      dx: 0, dy: 0,
      active: true,
      directionLocked: false,
      direction: null,
      startTime: Date.now(),
    }
    // Убираем transition для мгновенного следования за пальцем
    if (stripRef.current) {
      stripRef.current.style.transition = 'none'
    }
  }, [])

  const onCardTouchMove = useCallback((e: React.TouchEvent) => {
    const st = touch.current
    if (!st.active) return

    const t = e.touches[0]
    st.dx = t.clientX - st.startX
    st.dy = t.clientY - st.startY

    // Определяем направление жеста при первом значимом движении
    if (!st.directionLocked) {
      const ax = Math.abs(st.dx)
      const ay = Math.abs(st.dy)
      if (ax > 5 || ay > 5) {
        st.direction = ax > ay ? 'h' : 'v'
        st.directionLocked = true
      }
    }

    // Если вертикальный — не мешаем скроллу страницы, прекращаем drag
    if (st.direction === 'v') return

    // Горизонтальный свайп: двигаем ленту за пальцем
    // Добавляем elasticity на краях (делим смещение на 3)
    let dx = st.dx
    if ((index === 0 && dx > 0) || (index === photos.length - 1 && dx < 0)) {
      dx = dx / 3
    }

    const baseX = -index * gW
    applyTransform(stripRef, baseX + dx)
  }, [index, gW, photos.length, applyTransform])

  const onCardTouchEnd = useCallback(() => {
    const st = touch.current
    if (!st.active) return
    st.active = false

    // Тап (маленькое смещение) → открываем fullscreen
    if (Math.abs(st.dx) < TAP_PX && Math.abs(st.dy) < TAP_PX) {
      setFullscreen(true)
      return
    }

    // Вертикальный свайп — ничего не делаем (скролл обработан браузером)
    if (st.direction === 'v') return

    // Velocity: px/ms → определяем быстрый свайп
    const elapsed = Date.now() - st.startTime
    const velocity = elapsed > 0 ? Math.abs(st.dx) / elapsed : 0

    // Определяем новый index
    let newIdx = index
    if ((st.dx > SWIPE_PX || velocity > 0.5) && st.dx > 0 && index > 0) {
      newIdx = index - 1
    } else if ((Math.abs(st.dx) > SWIPE_PX || velocity > 0.5) && st.dx < 0 && index < photos.length - 1) {
      newIdx = index + 1
    }

    // Анимируем snap к целевой позиции
    applyTransform(stripRef, -newIdx * gW, 0, true)
    setIndex(newIdx)
  }, [index, gW, photos.length, applyTransform])

  // ═══════════════════════════════════════════════════════════
  //  FULLSCREEN — touch handlers
  // ═══════════════════════════════════════════════════════════

  const onFsTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    fsTouch.current = {
      startX: t.clientX,
      startY: t.clientY,
      dx: 0, dy: 0,
      active: true,
      directionLocked: false,
      direction: null,
      startTime: Date.now(),
    }
    if (fsStripRef.current) {
      fsStripRef.current.style.transition = 'none'
    }
  }, [])

  const onFsTouchMove = useCallback((e: React.TouchEvent) => {
    const st = fsTouch.current
    if (!st.active) return

    const t = e.touches[0]
    st.dx = t.clientX - st.startX
    st.dy = t.clientY - st.startY

    // Блокировка направления
    if (!st.directionLocked) {
      const ax = Math.abs(st.dx)
      const ay = Math.abs(st.dy)
      if (ax > 5 || ay > 5) {
        st.direction = ax > ay ? 'h' : 'v'
        st.directionLocked = true
      }
    }

    const w = window.innerWidth
    const baseX = -index * w

    if (st.direction === 'h') {
      // Горизонтальный свайп: листание фото
      let dx = st.dx
      if ((index === 0 && dx > 0) || (index === photos.length - 1 && dx < 0)) {
        dx = dx / 3
      }
      applyTransform(fsStripRef, baseX + dx, 0)
    } else if (st.direction === 'v') {
      // Вертикальный свайп: закрытие (двигаем по Y, уменьшаем opacity)
      applyTransform(fsStripRef, baseX, st.dy)
      // Плавное затемнение фона
      const opacity = Math.max(0.3, 1 - Math.abs(st.dy) / 300)
      const fsEl = fsStripRef.current?.parentElement
      if (fsEl) fsEl.style.background = `rgba(0, 0, 0, ${opacity})`
    }

    // Предотвращаем скролл страницы в fullscreen
    e.preventDefault()
  }, [index, photos.length, applyTransform])

  const onFsTouchEnd = useCallback(() => {
    const st = fsTouch.current
    if (!st.active) return
    st.active = false

    const w = window.innerWidth

    // Тап → закрытие
    if (Math.abs(st.dx) < TAP_PX && Math.abs(st.dy) < TAP_PX) {
      setFullscreen(false)
      return
    }

    const elapsed = Date.now() - st.startTime
    const velocity = elapsed > 0 ? Math.abs(st.dx) / elapsed : 0

    if (st.direction === 'h') {
      // Горизонтальный свайп: переключение фото
      let newIdx = index
      if ((st.dx > SWIPE_PX || velocity > 0.5) && st.dx > 0 && index > 0) {
        newIdx = index - 1
      } else if ((Math.abs(st.dx) > SWIPE_PX || velocity > 0.5) && st.dx < 0 && index < photos.length - 1) {
        newIdx = index + 1
      }
      applyTransform(fsStripRef, -newIdx * w, 0, true)
      setIndex(newIdx)
    } else if (st.direction === 'v') {
      // Вертикальный свайп: закрытие или snap back
      const velocityY = elapsed > 0 ? Math.abs(st.dy) / elapsed : 0
      if (Math.abs(st.dy) > DISMISS_PX || velocityY > 0.5) {
        setFullscreen(false)
      } else {
        applyTransform(fsStripRef, -index * w, 0, true)
        // Восстанавливаем opacity фона
        const fsEl = fsStripRef.current?.parentElement
        if (fsEl) fsEl.style.background = ''
      }
    }
  }, [index, photos.length, applyTransform])

  // ═══════════════════════════════════════════════════════════
  //  Синхронизация позиции при изменении index / размеров
  // ═══════════════════════════════════════════════════════════

  /** При изменении gW или выходе из fullscreen — мгновенный snap */
  useEffect(() => {
    if (gW > 0 && !fullscreen) {
      applyTransform(stripRef, -index * gW)
    }
  }, [gW, fullscreen, index, applyTransform])

  /** При открытии fullscreen — мгновенный snap */
  useEffect(() => {
    if (fullscreen) {
      // Небольшая задержка чтобы DOM успел отрендериться
      requestAnimationFrame(() => {
        applyTransform(fsStripRef, -index * window.innerWidth)
      })
    }
  }, [fullscreen, index, applyTransform])

  // ═══════════════════════════════════════════════════════════
  //  Рендер
  // ═══════════════════════════════════════════════════════════

  if (photos.length === 0) {
    return <div className="gallery-placeholder">{fallbackIcon}</div>
  }

  return (
    <>
      {/* ─── Карточка ────────────────────────────────────── */}
      <div
        className="gallery"
        ref={galleryRef}
        style={{ touchAction: photos.length > 1 ? 'pan-y' : 'auto' }}
      >
        <div
          ref={stripRef}
          className="gallery-strip"
          onTouchStart={photos.length > 1 ? onCardTouchStart : undefined}
          onTouchMove={photos.length > 1 ? onCardTouchMove : undefined}
          onTouchEnd={photos.length > 1 ? onCardTouchEnd : undefined}
          onClick={photos.length === 1 ? () => setFullscreen(true) : undefined}
          style={{ willChange: 'transform' }}
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
        </div>

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

            <div
              ref={fsStripRef}
              className="gallery-fs-strip"
              onTouchStart={onFsTouchStart}
              onTouchMove={onFsTouchMove}
              onTouchEnd={onFsTouchEnd}
              style={{ willChange: 'transform', touchAction: 'none' }}
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
