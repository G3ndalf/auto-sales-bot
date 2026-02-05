import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Garage, Star, Eye, Phone, ChatRound, ChatSquare } from '@solar-icons/react'
import { api } from '../api'
import type { CarAdFull } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import PhotoGallery from '../components/PhotoGallery'

// ─── Варианты анимаций ──────────────────────────────────────

/** Stagger-контейнер: дочерние элементы появляются последовательно */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

/** Каждый инфо-блок плавно появляется снизу */
const fadeUpItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

/** Мягкое spring-появление футера с контактами */
const footerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24, delay: 0.35 },
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

export default function CarAdDetail() {
  useBackButton()
  const { id } = useParams<{ id: string }>()
  const [ad, setAd] = useState<CarAdFull | null>(null)
  // photoIndex больше не нужен — управляется внутри PhotoGallery
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

  return (
    <div className="detail-page">
      {/* Галерея фото — scroll-snap, НЕ ТРОГАЕМ */}
      <PhotoGallery
        photos={ad.photos.map(p => api.photoUrl(p))}
        alt={`${ad.brand} ${ad.model}`}
        fallbackIcon={<Garage size={48} weight="BoldDuotone" className="opacity-30" />}
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
          <h1>{ad.brand} {ad.model}</h1>
          <div className="flex items-center gap-2">
            <div className="detail-price">{formatPrice(ad.price)}</div>

            {/* Звёздочка избранного: bounce при нажатии + плавная смена иконки */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onClick={toggleFavorite}
              disabled={favoriteLoading}
              className="bg-transparent border-none text-2xl cursor-pointer"
              style={{ opacity: favoriteLoading ? 0.5 : 1 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isFavorite ? 'fav' : 'no-fav'}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'inline-flex' }}
                >
                  {isFavorite
                    ? <Star size={22} weight="Bold" color="#F59E0B" />
                    : <Star size={22} weight="Linear" color="#9CA3AF" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>

        {/* Просмотры */}
        <motion.p variants={fadeUpItem} className="text-[#9CA3AF] text-sm px-4 pb-2 m-0">
          <Eye size={14} weight="BoldDuotone" /> {ad.view_count} просмотров
        </motion.p>

        {/* Характеристики */}
        <motion.div variants={fadeUpItem} className="detail-specs">
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
          href={`https://t.me/autoskfo_bot?start=msg_car_${ad.id}`}
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
