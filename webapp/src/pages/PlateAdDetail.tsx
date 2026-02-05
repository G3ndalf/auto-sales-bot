import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Hashtag, Star, Eye, Phone, ChatRound, ChatSquare } from '@solar-icons/react'
import { api } from '../api'
import type { PlateAdFull } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import PhotoGallery from '../components/PhotoGallery'

export default function PlateAdDetail() {
  useBackButton()
  const { id } = useParams<{ id: string }>()
  const [ad, setAd] = useState<PlateAdFull | null>(null)
  // photoIndex больше не нужен — управляется внутри PhotoGallery
  const [loading, setLoading] = useState(true)

  // ─── Избранное ─────────────────────────────────────────────
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    api.getPlateAd(Number(id)).then(data => {
      setAd(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  // Проверяем, есть ли объявление в избранном
  useEffect(() => {
    if (!id) return
    api.getFavorites()
      .then(data => {
        const found = data.items.some(item => item.ad_type === 'plate' && item.id === Number(id))
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
        await api.removeFavorite('plate', Number(id))
        setIsFavorite(false)
      } else {
        await api.addFavorite('plate', Number(id))
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

  return (
    <div className="detail-page">
      {/* Галерея фото — нажатие лево/право листает, центр открывает на весь экран */}
      <PhotoGallery
        photos={ad.photos.map(p => api.photoUrl(p))}
        alt={ad.plate_number}
        fallbackIcon={<Hashtag size={48} weight="BoldDuotone" className="opacity-30" />}
      />

      {/* Title & price & favorite */}
      <div className="detail-header">
        <h1 className="plate-title">{ad.plate_number}</h1>
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
            {isFavorite ? <Star size={22} weight="Bold" color="#F59E0B" /> : <Star size={22} weight="Linear" color="#9CA3AF" />}
          </motion.button>
        </div>
      </div>

      {/* Просмотры */}
      <p className="text-[#9CA3AF] text-sm px-4 pb-2 m-0">
        <Eye size={14} weight="BoldDuotone" /> {ad.view_count} просмотров
      </p>

      {/* Info */}
      <motion.div
        className="detail-specs"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
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
          <Phone size={16} weight="BoldDuotone" /> Позвонить
        </a>
        <a
          href={`https://t.me/autoskfo_bot?start=msg_plate_${ad.id}`}
          className="btn btn-secondary detail-footer__btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ChatSquare size={16} weight="BoldDuotone" /> Написать
        </a>
        {ad.contact_telegram && (
          <a
            href={`https://t.me/${ad.contact_telegram.replace('@', '')}`}
            className="btn btn-secondary detail-footer__btn"
            target="_blank"
          >
            <ChatRound size={14} weight="BoldDuotone" /> Telegram
          </a>
        )}
      </div>
    </div>
  )
}
