import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import type { CarAdFull } from '../api'
import { useBackButton } from '../hooks/useBackButton'

export default function CarAdDetail() {
  useBackButton()
  const { id } = useParams<{ id: string }>()
  const [ad, setAd] = useState<CarAdFull | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // ─── Избранное ─────────────────────────────────────────────
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    api.getCarAd(Number(id)).then(data => {
      setAd(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  // Проверяем, есть ли объявление в избранном
  useEffect(() => {
    if (!id) return
    api.getFavorites()
      .then(data => {
        const found = data.items.some(item => item.ad_type === 'car' && item.id === Number(id))
        setIsFavorite(found)
      })
      .catch(() => {})
  }, [id])

  /** Переключить избранное */
  const toggleFavorite = async () => {
    if (!id) return
    setFavoriteLoading(true)
    try {
      if (isFavorite) {
        await api.removeFavorite('car', Number(id))
        setIsFavorite(false)
      } else {
        await api.addFavorite('car', Number(id))
        setIsFavorite(true)
      }
    } catch { /* ignore */ }
    setFavoriteLoading(false)
  }

  if (loading) return <div className="loading">Загрузка...</div>
  if (!ad) return <div className="loading">Объявление не найдено</div>

  const formatPrice = (n: number) => n.toLocaleString('ru-RU') + ' ₽'
  const formatDate = (s: string | null) => {
    if (!s) return ''
    return new Date(s).toLocaleDateString('ru-RU')
  }

  const prevPhoto = () => setPhotoIndex(i => Math.max(0, i - 1))
  const nextPhoto = () => setPhotoIndex(i => Math.min(ad.photos.length - 1, i + 1))

  return (
    <div className="detail-page">
      <Link to={`/cars?brand=${encodeURIComponent(ad.brand)}`} className="back-btn">
        ← Назад
      </Link>

      {/* Photo gallery */}
      {ad.photos.length > 0 ? (
        <div className="gallery">
          <img
            src={api.photoUrl(ad.photos[photoIndex])}
            alt={`${ad.brand} ${ad.model}`}
            className="gallery-img"
          />
          {ad.photos.length > 1 && (
            <>
              <div className="gallery-nav">
                <button onClick={prevPhoto} disabled={photoIndex === 0}>‹</button>
                <span>{photoIndex + 1} / {ad.photos.length}</span>
                <button onClick={nextPhoto} disabled={photoIndex === ad.photos.length - 1}>›</button>
              </div>
              <div className="gallery-dots">
                {ad.photos.map((_, i) => (
                  <button
                    key={i}
                    className={`gallery-dot${i === photoIndex ? ' active' : ''}`}
                    onClick={() => setPhotoIndex(i)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="gallery-placeholder">🚗</div>
      )}

      {/* Title & price & favorite */}
      <div className="detail-header">
        <h1>{ad.brand} {ad.model}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="detail-price">{formatPrice(ad.price)}</div>
          <button
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            style={{
              background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer',
              color: isFavorite ? '#f59e0b' : 'var(--hint)',
              opacity: favoriteLoading ? 0.5 : 1,
            }}
          >
            {isFavorite ? '⭐' : '☆'}
          </button>
        </div>
      </div>

      {/* Просмотры */}
      <p style={{ color: 'var(--hint, #999)', fontSize: '0.85em', padding: '0 16px 8px', margin: 0 }}>
        👁 {ad.view_count} просмотров
      </p>

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

      {/* Sticky contact footer — Позвонить, Написать через бота, Telegram */}
      <div className="detail-footer">
        <a href={`tel:${ad.contact_phone}`} className="btn btn-gradient detail-footer__btn">
          📞 Позвонить
        </a>
        <a
          href={`https://t.me/autoskfo_bot?start=msg_car_${ad.id}`}
          className="btn btn-secondary detail-footer__btn"
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
    </div>
  )
}
