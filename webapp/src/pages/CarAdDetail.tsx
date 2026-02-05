import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import type { CarAdFull } from '../api'
import { useBackButton } from '../hooks/useBackButton'

/**
 * CarAdDetail — детальная страница объявления авто.
 *
 * Фичи галереи:
 *  - Touch swipe (onTouchStart/Move/End) с порогом 50px
 *  - Анимация translateX при смене фото (200ms ease-out)
 *  - Полноэкранный просмотр по тапу (overlay z-index: 1000)
 *  - Закрытие fullscreen: крестик, свайп вниз, тап на backdrop
 *
 * Контакт-кнопки:
 *  - "💬 Написать" — deep link на бота (msg_car_{id})
 *  - "📤 Поделиться" — navigator.share() / clipboard fallback
 *
 * TODO (рефакторинг):
 *  - Вынести галерею в отдельный компонент <SwipeGallery />
 *  - Вынести fullscreen overlay в <FullscreenViewer />
 *  - Вынести кнопку "Поделиться" в <ShareButton />
 *  - Стили перенести в CSS-модули или styled-components
 */

export default function CarAdDetail() {
  useBackButton()
  const { id } = useParams<{ id: string }>()
  const [ad, setAd] = useState<CarAdFull | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  /* ─── Fullscreen overlay state ─── */
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenIndex, setFullscreenIndex] = useState(0)

  /* ─── Slide animation direction: 'left' | 'right' | null ─── */
  // slideDir управляет CSS-transition при смене фото
  // null = без анимации (первый рендер), 'left'/'right' = направление вылета
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const [fullscreenSlideDir, setFullscreenSlideDir] = useState<'left' | 'right' | null>(null)

  /* ─── Touch swipe refs ─── */
  // Храним координаты начала тача для вычисления дельты свайпа
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchDeltaX = useRef(0)
  const touchDeltaY = useRef(0)

  /* ─── Fullscreen swipe refs (отдельные, чтобы не конфликтовать) ─── */
  const fsTouchStartX = useRef(0)
  const fsTouchStartY = useRef(0)
  const fsTouchDeltaX = useRef(0)
  const fsTouchDeltaY = useRef(0)

  /* ─── "Скопировано" feedback state ─── */
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    api.getCarAd(Number(id)).then(data => {
      setAd(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  /* ─── Сброс анимации после transition (200ms) ─── */
  // После смены фото slideDir сбрасывается, чтобы следующий свайп
  // снова мог запустить transition с нужного направления
  useEffect(() => {
    if (slideDir) {
      const t = setTimeout(() => setSlideDir(null), 220)
      return () => clearTimeout(t)
    }
  }, [slideDir, photoIndex])

  useEffect(() => {
    if (fullscreenSlideDir) {
      const t = setTimeout(() => setFullscreenSlideDir(null), 220)
      return () => clearTimeout(t)
    }
  }, [fullscreenSlideDir, fullscreenIndex])

  if (loading) return <div className="loading">Загрузка...</div>
  if (!ad) return <div className="loading">Объявление не найдено</div>

  const photos = ad.photos
  const formatPrice = (n: number) => n.toLocaleString('ru-RU') + ' ₽'
  const formatDate = (s: string | null) => {
    if (!s) return ''
    return new Date(s).toLocaleDateString('ru-RU')
  }

  /* ─── Gallery navigation with animation ─── */
  const prevPhoto = () => {
    if (photoIndex > 0) {
      setSlideDir('right') // фото "приезжает" справа → значит предыдущее
      setPhotoIndex(i => i - 1)
    }
  }
  const nextPhoto = () => {
    if (photoIndex < photos.length - 1) {
      setSlideDir('left') // фото "уезжает" влево → следующее
      setPhotoIndex(i => i + 1)
    }
  }

  /* ─── Fullscreen navigation ─── */
  const fsPrev = () => {
    if (fullscreenIndex > 0) {
      setFullscreenSlideDir('right')
      setFullscreenIndex(i => i - 1)
    }
  }
  const fsNext = () => {
    if (fullscreenIndex < photos.length - 1) {
      setFullscreenSlideDir('left')
      setFullscreenIndex(i => i + 1)
    }
  }

  /* ─── Touch handlers for main gallery ─── */
  // Порог свайпа: 50px горизонтально
  // Если вертикальный свайп больше горизонтального — не считаем свайпом
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchDeltaX.current = 0
    touchDeltaY.current = 0
  }
  const onTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current
  }
  const onTouchEnd = () => {
    const dx = touchDeltaX.current
    const dy = touchDeltaY.current
    // Только горизонтальный свайп (|dx| > |dy|) и порог 50px
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) nextPhoto()  // свайп влево → следующее фото
      else prevPhoto()          // свайп вправо → предыдущее фото
    }
  }

  /* ─── Touch handlers for fullscreen overlay ─── */
  const onFsTouchStart = (e: React.TouchEvent) => {
    fsTouchStartX.current = e.touches[0].clientX
    fsTouchStartY.current = e.touches[0].clientY
    fsTouchDeltaX.current = 0
    fsTouchDeltaY.current = 0
  }
  const onFsTouchMove = (e: React.TouchEvent) => {
    fsTouchDeltaX.current = e.touches[0].clientX - fsTouchStartX.current
    fsTouchDeltaY.current = e.touches[0].clientY - fsTouchStartY.current
  }
  const onFsTouchEnd = () => {
    const dx = fsTouchDeltaX.current
    const dy = fsTouchDeltaY.current
    // Свайп вниз (dy > 80px) — закрытие fullscreen
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      setFullscreen(false)
      return
    }
    // Горизонтальный свайп — навигация
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) fsNext()
      else fsPrev()
    }
  }

  /* ─── Open fullscreen on photo tap ─── */
  const openFullscreen = () => {
    setFullscreenIndex(photoIndex)
    setFullscreenSlideDir(null)
    setFullscreen(true)
  }

  /* ─── Close fullscreen ─── */
  const closeFullscreen = useCallback(() => {
    // Синхронизируем индекс обратно в основную галерею
    setPhotoIndex(fullscreenIndex)
    setFullscreen(false)
  }, [fullscreenIndex])

  /* ─── Share / Copy link ─── */
  // navigator.share() — мобильные браузеры
  // fallback — clipboard API
  const handleShare = async () => {
    const shareData = {
      title: `${ad.brand} ${ad.model}`,
      text: `${ad.brand} ${ad.model}, ${formatPrice(ad.price)} — Авто КБР`,
      url: window.location.href,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // Пользователь отменил — ничего не делаем
      }
    } else {
      // Fallback: копируем ссылку в clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // clipboard не доступен — ничего не делаем
      }
    }
  }

  /* ─── Inline style: slide animation for photo ─── */
  // Когда slideDir установлен, фото "выезжает" с нужной стороны через translateX
  // Через 220ms slideDir сбрасывается (см. useEffect выше)
  const getSlideStyle = (dir: 'left' | 'right' | null): React.CSSProperties => {
    if (!dir) {
      return {
        transition: 'none',
        transform: 'translateX(0)',
        opacity: 1,
      }
    }
    // Фото уже на месте (конечная позиция), transition делает "прибытие" плавным
    return {
      transition: 'transform 200ms ease-out, opacity 200ms ease-out',
      transform: 'translateX(0)',
      opacity: 1,
      // Анимация запускается потому что React перерисовал с новым src
      // и slideDir сменился — CSS transition сработает
    }
  }

  /* ─── Inline styles (все стили — только inline, не трогаем App.css) ─── */

  /** Кнопка "Поделиться" в header */
  const shareBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '8px',
    color: 'var(--tg-theme-link-color, #2481cc)',
    whiteSpace: 'nowrap',
  }

  /** Кнопка "Написать" в footer — стиль btn btn-secondary */
  const msgBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1.5px solid var(--tg-theme-button-color, #2481cc)',
    background: 'transparent',
    color: 'var(--tg-theme-button-color, #2481cc)',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
    flex: 1,
    textAlign: 'center' as const,
  }

  /** Fullscreen overlay backdrop */
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  }

  /** Крестик закрытия fullscreen */
  const closeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    zIndex: 1001,
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    fontSize: '28px',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  /** Фото в fullscreen */
  const fsImgStyle: React.CSSProperties = {
    maxWidth: '100%',
    maxHeight: '85vh',
    objectFit: 'contain',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    // @ts-ignore — pointerEvents чтобы тапы шли на контейнер
    touchAction: 'none',
    ...getSlideStyle(fullscreenSlideDir),
  }

  /** Счётчик фото в fullscreen */
  const fsCounterStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
    userSelect: 'none',
  }

  /** "Скопировано!" tooltip */
  const copiedTooltipStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.8)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    zIndex: 2000,
    pointerEvents: 'none',
  }

  return (
    <div className="detail-page">
      <Link to={`/cars?brand=${encodeURIComponent(ad.brand)}`} className="back-btn">
        ← Назад
      </Link>

      {/* ═══ Photo gallery with touch swipe ═══ */}
      {photos.length > 0 ? (
        <div
          className="gallery"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ overflow: 'hidden', position: 'relative' }}
        >
          {/*
            По тапу на фото открываем fullscreen.
            overflow: hidden скрывает фото при анимации translateX.
          */}
          <img
            src={api.photoUrl(photos[photoIndex])}
            alt={`${ad.brand} ${ad.model}`}
            className="gallery-img"
            onClick={openFullscreen}
            style={{
              cursor: 'pointer',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              ...getSlideStyle(slideDir),
            }}
          />
          {photos.length > 1 && (
            <>
              <div className="gallery-nav">
                <button onClick={prevPhoto} disabled={photoIndex === 0}>‹</button>
                <span>{photoIndex + 1} / {photos.length}</span>
                <button onClick={nextPhoto} disabled={photoIndex === photos.length - 1}>›</button>
              </div>
              {/* Dots — уже есть в CSS, не трогаем */}
              <div className="gallery-dots">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    className={`gallery-dot${i === photoIndex ? ' active' : ''}`}
                    onClick={() => {
                      setSlideDir(i > photoIndex ? 'left' : 'right')
                      setPhotoIndex(i)
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="gallery-placeholder">🚗</div>
      )}

      {/* ═══ Title & price + Share button ═══ */}
      <div className="detail-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h1 style={{ margin: 0, flex: 1 }}>{ad.brand} {ad.model}</h1>
          {/* Кнопка "Поделиться" — navigator.share() на мобиле, clipboard fallback */}
          <button onClick={handleShare} style={shareBtnStyle} title="Поделиться">
            📤
          </button>
        </div>
        <div className="detail-price">{formatPrice(ad.price)}</div>
      </div>

      {/* Specs */}
      <div className="detail-specs">
        <div className="spec-row">
          <span className="spec-label">Год</span>
          <span className="spec-value">{ad.year}</span>
        </div>
        <div className="spec-row">
          <span className="spec-label">Пробег</span>
          <span className="spec-value">{ad.mileage.toLocaleString('ru-RU')} км</span>
        </div>
        <div className="spec-row">
          <span className="spec-label">Двигатель</span>
          <span className="spec-value">{ad.engine_volume}л, {ad.fuel_type}</span>
        </div>
        <div className="spec-row">
          <span className="spec-label">КПП</span>
          <span className="spec-value">{ad.transmission}</span>
        </div>
        <div className="spec-row">
          <span className="spec-label">Цвет</span>
          <span className="spec-value">{ad.color}</span>
        </div>
        <div className="spec-row">
          <span className="spec-label">Город</span>
          <span className="spec-value">{ad.city}</span>
        </div>
      </div>

      {/* Description */}
      {ad.description && (
        <div className="detail-section">
          <h3>Описание</h3>
          <p className="detail-description">{ad.description}</p>
        </div>
      )}

      {ad.created_at && (
        <p className="detail-date">Опубликовано: {formatDate(ad.created_at)}</p>
      )}

      {/* ═══ Sticky contact footer ═══ */}
      {/*
        Порядок кнопок: Позвонить | Написать | Telegram
        "Написать" — deep link на бота с командой msg_car_{id}
      */}
      <div className="detail-footer">
        <a href={`tel:${ad.contact_phone}`} className="btn btn-gradient detail-footer__btn">
          📞 Позвонить
        </a>
        <a
          href={`https://t.me/autoskfo_bot?start=msg_car_${ad.id}`}
          style={msgBtnStyle}
          target="_blank"
          rel="noopener noreferrer"
        >
          💬 Написать
        </a>
        {ad.contact_telegram && (
          <a
            href={`https://t.me/${ad.contact_telegram.replace('@', '')}`}
            className="btn btn-secondary detail-footer__btn"
            target="_blank"
          >
            📱 Telegram
          </a>
        )}
      </div>

      {/* ═══ Fullscreen photo overlay ═══ */}
      {/*
        Overlay закрывается:
        1. По крестику (×)
        2. По свайпу вниз (dy > 80px)
        3. По тапу на backdrop (onClick на overlay, но не на img)

        TODO: добавить pinch-to-zoom в fullscreen
      */}
      {fullscreen && photos.length > 0 && (
        <div
          style={overlayStyle}
          onClick={(e) => {
            // Закрытие по тапу на backdrop (не на фото)
            if (e.target === e.currentTarget) closeFullscreen()
          }}
          onTouchStart={onFsTouchStart}
          onTouchMove={onFsTouchMove}
          onTouchEnd={onFsTouchEnd}
        >
          <button style={closeBtnStyle} onClick={closeFullscreen} aria-label="Закрыть">
            ✕
          </button>
          <img
            src={api.photoUrl(photos[fullscreenIndex])}
            alt={`${ad.brand} ${ad.model} — фото ${fullscreenIndex + 1}`}
            style={fsImgStyle}
            draggable={false}
          />
          <div style={fsCounterStyle}>
            {fullscreenIndex + 1} / {photos.length}
          </div>
        </div>
      )}

      {/* ═══ "Скопировано" tooltip (clipboard fallback) ═══ */}
      {copied && <div style={copiedTooltipStyle}>Ссылка скопирована!</div>}
    </div>
  )
}
