import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Hashtag, Star, Eye, Phone, ChatRound, ChatSquare } from '@solar-icons/react'
import { api } from '../api'
import type { PlateAdFull } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import PhotoGallery from '../components/PhotoGallery'

// ─── Варианты анимаций ──────────────────────────────────────

/** Stagger-контейнер: дочерние элементы появляются последовательно */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

/** Каждый инфо-блок плавно появляется снизу */
const fadeUpItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

/** Мягкое spring-появление футера с контактами */
const footerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24, delay: 0.15 },
  },
}

/** Бейдж «Продано» — появление с масштабированием */
const soldBadgeVariants = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 20, delay: 0.15 },
  },
}

// ─────────────────────────────────────────────────────────────

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

  if (loading) return null
  if (!ad) return <div className="loading">Объявление не найдено</div>

  const formatPrice = (n: number) => n.toLocaleString('ru-RU') + ' ₽'
  const formatDate = (s: string | null) => {
    if (!s) return ''
    return new Date(s).toLocaleDateString('ru-RU')
  }

  return (
    <div className="detail-page">
      {/* Галерея фото — scroll-snap, НЕ ТРОГАЕМ */}
      <PhotoGallery
        photos={ad.photos.map(p => api.photoUrl(p))}
        alt={ad.plate_number}
        fallbackIcon={<Hashtag size={48} weight="BoldDuotone" className="opacity-30" />}
      />

      {/* Бейдж «Продано» — показываем если объявление продано */}
      {(ad as any).is_sold && (
        <motion.div
          className="sold-badge"
          variants={soldBadgeVariants}
          initial="hidden"
          animate="visible"
        >
          Продано
        </motion.div>
      )}

      {/* ─── Stagger-контейнер для информационных блоков ─── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Заголовок, цена и кнопка избранного */}
        <motion.div variants={fadeUpItem} className="detail-header">
          <h1 className="plate-title">{ad.plate_number}</h1>
          <div className="flex items-center gap-2">
            <div className="detail-price">{formatPrice(ad.price)}</div>

            {/* Звёздочка избранного: bounce при нажатии */}
            <motion.button
              whileTap={{ scale: 0.75 }}
              onClick={toggleFavorite}
              disabled={favoriteLoading}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 4, display: 'inline-flex',
                opacity: favoriteLoading ? 0.5 : 1,
              }}
            >
              {isFavorite
                ? <Star size={22} weight="Bold" color="#F59E0B" />
                : <Star size={22} weight="Linear" color="#9CA3AF" />}
            </motion.button>
          </div>
        </motion.div>

        {/* Просмотры */}
        <motion.p variants={fadeUpItem} className="text-[#9CA3AF] text-sm px-4 pb-2 m-0">
          <Eye size={14} weight="BoldDuotone" /> {ad.view_count} просмотров
        </motion.p>

        {/* Информация о номере */}
        <motion.div variants={fadeUpItem} className="detail-specs">
          <div className="spec-row">
            <span className="spec-label">Город</span>
            <span className="spec-value">{ad.city}</span>
          </div>
        </motion.div>

        {/* Описание */}
        {ad.description && (
          <motion.div variants={fadeUpItem} className="detail-section">
            <h3>Описание</h3>
            <p className="detail-description">{ad.description}</p>
          </motion.div>
        )}

        {/* Дата публикации */}
        {ad.created_at && (
          <motion.p variants={fadeUpItem} className="detail-date">
            Опубликовано: {formatDate(ad.created_at)}
          </motion.p>
        )}
      </motion.div>

      {/* Sticky-футер с контактами — spring-появление */}
      <motion.div
        className="detail-footer"
        variants={footerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Кнопка «Позвонить» — основной CTA с subtle glow-пульсацией */}
        <motion.a
          href={`tel:${ad.contact_phone}`}
          className="btn btn-gradient detail-footer__btn"
          animate={{
            boxShadow: [
              '0 0 0px rgba(99,102,241,0)',
              '0 0 12px rgba(99,102,241,0.35)',
              '0 0 0px rgba(99,102,241,0)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Phone size={16} weight="BoldDuotone" /> Позвонить
        </motion.a>
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
      </motion.div>
    </div>
  )
}
