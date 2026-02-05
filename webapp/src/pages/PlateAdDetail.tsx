import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Hashtag, Star, Eye, Phone, ChatSquare } from '@solar-icons/react'
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
        {/* Заголовок + цена + звезда + просмотры — компактный блок */}
        <motion.div variants={fadeUpItem} style={{
          padding: '12px 16px',
          background: 'var(--section-bg)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          {/* Левая часть: номер + цена */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '1.25em', fontWeight: 800, margin: 0, lineHeight: 1.2, letterSpacing: '0.05em' }}>
              {ad.plate_number}
            </h1>
            <div style={{ fontSize: '1.2em', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>
              {formatPrice(ad.price)}
            </div>
          </div>

          {/* Правая часть: звезда + просмотры */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
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
                ? <Star size={24} weight="Bold" color="#F59E0B" />
                : <Star size={24} weight="Linear" color="#9CA3AF" />}
            </motion.button>
            <span style={{ fontSize: '11px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Eye size={12} weight="BoldDuotone" /> {ad.view_count}
            </span>
          </div>
        </motion.div>

        {/* Город — один блок */}
        <motion.div variants={fadeUpItem} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1px',
          background: 'var(--border)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ background: 'var(--section-bg)', padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--hint)', marginBottom: '2px' }}>Город</div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>{ad.region ? `${ad.city}, ${ad.region}` : ad.city}</div>
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
        {/* Кнопка «Показать» — popup с номером + копирование */}
        <button
          className="btn btn-gradient detail-footer__btn"
          onClick={() => {
            const raw = ad.contact_phone
            /* Форматируем номер с дефисами: 8-XXX-XXX-XX-XX */
            const digits = raw.replace(/\D/g, '')
            const formatted = digits.length === 11
              ? `${digits[0]}-${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7,9)}-${digits.slice(9,11)}`
              : raw
            navigator.clipboard?.writeText(formatted).catch(() => {})
            const wa = window.Telegram?.WebApp
            if (wa?.showPopup) {
              wa.showPopup({
                title: 'Номер скопирован',
                message: formatted,
                buttons: [{ id: 'ok', type: 'default', text: 'OK' }],
              })
            } else {
              alert(formatted)
            }
          }}
        >
          <Phone size={18} weight="BoldDuotone" /> Показать
        </button>
        {/* «Написать» — только если у автора есть username */}
        {ad.author_username && (
          <button
            className="btn btn-secondary detail-footer__btn"
            onClick={() => {
              const wa = window.Telegram?.WebApp
              const url = `https://t.me/${ad.author_username}`
              if (wa?.openTelegramLink) wa.openTelegramLink(url)
              else window.open(url, '_blank')
            }}
          >
            <ChatSquare size={16} weight="BoldDuotone" /> Написать
          </button>
        )}
      </motion.div>
    </div>
  )
}
