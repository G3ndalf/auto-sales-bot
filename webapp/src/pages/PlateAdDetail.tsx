import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, PlateAdFull } from '../api'

export default function PlateAdDetail() {
  const { id } = useParams<{ id: string }>()
  const [ad, setAd] = useState<PlateAdFull | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.getPlateAd(Number(id)).then(data => {
      setAd(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

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
      <Link to="/plates" className="back-btn">← Назад</Link>

      {/* Photo gallery */}
      {ad.photos.length > 0 ? (
        <div className="gallery">
          <img
            src={api.photoUrl(ad.photos[photoIndex])}
            alt={ad.plate_number}
            className="gallery-img"
          />
          {ad.photos.length > 1 && (
            <div className="gallery-nav">
              <button onClick={prevPhoto} disabled={photoIndex === 0}>‹</button>
              <span>{photoIndex + 1} / {ad.photos.length}</span>
              <button onClick={nextPhoto} disabled={photoIndex === ad.photos.length - 1}>›</button>
            </div>
          )}
        </div>
      ) : (
        <div className="gallery-placeholder">🔢</div>
      )}

      {/* Title & price */}
      <div className="detail-header">
        <h1 className="plate-title">{ad.plate_number}</h1>
        <div className="detail-price">{formatPrice(ad.price)}</div>
      </div>

      {/* Info */}
      <div className="detail-specs">
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

      {/* Contacts */}
      <div className="detail-contacts">
        <a href={`tel:${ad.contact_phone}`} className="btn btn-primary">
          📞 {ad.contact_phone}
        </a>
        {ad.contact_telegram && (
          <a
            href={`https://t.me/${ad.contact_telegram.replace('@', '')}`}
            className="btn btn-secondary"
            target="_blank"
          >
            📱 {ad.contact_telegram}
          </a>
        )}
      </div>

      {ad.created_at && (
        <p className="detail-date">Опубликовано: {formatDate(ad.created_at)}</p>
      )}
    </div>
  )
}
