import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Car, Star, Eye, Phone, MessageCircle, MessageSquare } from 'lucide-react'
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
      {/* Навигация назад — через TG BackButton */}

      {/* Photo gallery */}
      {ad.photos.length > 0 ? (
        <div className="gallery">
          <AnimatePresence mode="wait">
            <motion.img
              key={photoIndex}
              src={api.photoUrl(ad.photos[photoIndex])}
              alt={`${ad.brand} ${ad.model}`}
              className="gallery-img"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>
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
        <div className="gallery-placeholder"><Car size={48} className="opacity-30" /></div>
      )}

      {/* Title & price & favorite */}
      <div className="detail-header">
        <h1>{ad.brand} {ad.model}</h1>
        <div className="flex items-center gap-2">
          <div className="detail-price">{formatPrice(ad.price)}</div>
          <motion.button
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={toggleFavorite}
            disabled={favoriteLoading}
            className="bg-transparent border-none text-2xl cursor-pointer"
            style={{ color: isFavorite ? '#F59E0B' : '#9CA3AF', opacity: favoriteLoading ? 0.5 : 1 }}
          >
            {isFavorite ? <Star size={22} fill="#F59E0B" stroke="#F59E0B" /> : <Star size={22} stroke="#9CA3AF" />}
          </motion.button>
        </div>
      </div>

      {/* Просмотры */}
      <p className="text-[#9CA3AF] text-sm px-4 pb-2 m-0">
        <Eye size={14} /> {ad.view_count} просмотров
      </p>

      {/* Specs */}
      <motion.div
        className="detail-specs"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
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
      </motion.div>

      {/* Description */}
      {ad.description && (
        <motion.div
          className="detail-section"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <h3>Описание</h3>
          <p className="detail-description">{ad.description}</p>
        </motion.div>
      )}

      {ad.created_at && (
        <p className="detail-date">Опубликовано: {formatDate(ad.created_at)}</p>
      )}

      {/* Sticky contact footer — Позвонить, Написать через бота, Telegram */}
      <div className="detail-footer">
        <a href={`tel:${ad.contact_phone}`} className="btn btn-gradient detail-footer__btn">
          <Phone size={16} /> Позвонить
        </a>
        <a
          href={`https://t.me/autoskfo_bot?start=msg_car_${ad.id}`}
          className="btn btn-secondary detail-footer__btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageSquare size={16} /> Написать
        </a>
        {ad.contact_telegram && (
          <a
            href={`https://t.me/${ad.contact_telegram.replace('@', '')}`}
            className="btn btn-secondary detail-footer__btn"
            target="_blank"
          >
            <MessageCircle size={14} /> Telegram
          </a>
        )}
      </div>
    </div>
  )
}
