import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Garage,
  Star,
  Eye,
  Phone,
  ChatSquare,
  CalendarMinimalistic,
  SpedometerMiddle,
  Transmission,
  Palette,
  GasStation,
  MapPoint,
  ClockCircle,
} from '@solar-icons/react'
import { api } from '../api'
import type { CarAdFull } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import PhotoGallery from '../components/PhotoGallery'

// ─── Цвета темы ──────────────────────────────────────────────

const C = {
  bg: '#0B0F19',
  card: '#111827',
  cardLight: '#1A2332',
  accent: '#F59E0B',
  accentDim: 'rgba(245, 158, 11, 0.15)',
  accentBorder: 'rgba(245, 158, 11, 0.12)',
  accentGlow: 'rgba(245, 158, 11, 0.25)',
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: 'rgba(255, 255, 255, 0.06)',
  glass: 'rgba(255, 255, 255, 0.03)',
  green: '#34D399',
  greenDim: 'rgba(52, 211, 153, 0.12)',
} as const

// ─── Варианты анимаций ──────────────────────────────────────

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const fadeUpItem = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } as const,
  },
}

const footerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 280, damping: 26, delay: 0.2 },
  },
}

const soldBadgeVariants = {
  hidden: { opacity: 0, scale: 0.7 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 350, damping: 20, delay: 0.15 },
  },
}

// ─── Компонент ──────────────────────────────────────────────

export default function CarAdDetail() {
  useBackButton()
  const { id } = useParams<{ id: string }>()
  const [ad, setAd] = useState<CarAdFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .getCarAd(Number(id))
      .then((data) => {
        setAd(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    api
      .getFavorites()
      .then((data) => {
        const found = data.items.some(
          (item) => item.ad_type === 'car' && item.id === Number(id),
        )
        setIsFavorite(found)
      })
      .catch(() => {})
  }, [id])

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
    } catch {
      /* ignore */
    }
    setFavoriteLoading(false)
  }

  if (loading) return null
  if (!ad) return <div className="loading">Объявление не найдено</div>

  const formatPrice = (n: number) => n.toLocaleString('ru-RU') + ' \u20BD'
  const formatDate = (s: string | null) => {
    if (!s) return ''
    return new Date(s).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // ─── Характеристики ───────────────────────────────────────
  type SpecItem = {
    icon: React.ReactNode
    label: string
    value: string
    highlight?: boolean
  }

  const specs: SpecItem[] = []

  if (ad.year > 0) {
    specs.push({
      icon: <CalendarMinimalistic size={18} weight="BoldDuotone" color={C.accent} />,
      label: 'Год выпуска',
      value: String(ad.year),
    })
  }
  if (ad.mileage > 0) {
    specs.push({
      icon: <SpedometerMiddle size={18} weight="BoldDuotone" color={C.accent} />,
      label: 'Пробег',
      value: ad.mileage.toLocaleString('ru-RU') + ' км',
    })
  }
  if (ad.engine_volume > 0) {
    specs.push({
      icon: <GasStation size={18} weight="BoldDuotone" color={C.accent} />,
      label: 'Двигатель',
      value: ad.engine_volume + ' л' + (ad.fuel_type ? ' / ' + ad.fuel_type : ''),
    })
  }
  if (ad.transmission) {
    specs.push({
      icon: <Transmission size={18} weight="BoldDuotone" color={C.accent} />,
      label: 'КПП',
      value: ad.transmission,
    })
  }
  if (ad.color) {
    specs.push({
      icon: <Palette size={18} weight="BoldDuotone" color={C.accent} />,
      label: 'Цвет',
      value: ad.color,
    })
  }
  if (ad.has_gbo) {
    specs.push({
      icon: <GasStation size={18} weight="BoldDuotone" color={C.green} />,
      label: 'ГБО',
      value: 'Установлено',
      highlight: true,
    })
  }
  specs.push({
    icon: <MapPoint size={18} weight="BoldDuotone" color={C.accent} />,
    label: 'Город',
    value: ad.region ? `${ad.city}, ${ad.region}` : ad.city,
  })

  // Cast ad для доступа к author_username и is_sold (приходят из API)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adAny = ad as any

  return (
    <div className="detail-page">
      {/* ─── Галерея фото — scroll-snap, НЕ ТРОГАЕМ ─── */}
      <PhotoGallery
        photos={ad.photos.map((p) => api.photoUrl(p))}
        alt={`${ad.brand} ${ad.model}`}
        fallbackIcon={
          <Garage size={48} weight="BoldDuotone" className="opacity-30" />
        }
      />

      {/* ─── Бейдж «Продано» ─── */}
      {adAny.is_sold && (
        <motion.div
          className="sold-badge"
          variants={soldBadgeVariants}
          initial="hidden"
          animate="visible"
        >
          Продано
        </motion.div>
      )}

      {/* ─── Основной контент ─── */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {/* ═══════════════════════════════════════════════════
            HEADER: название + цена + избранное
            ═══════════════════════════════════════════════════ */}
        <motion.div
          variants={fadeUpItem}
          style={{
            padding: '20px 20px 18px',
            background: `linear-gradient(180deg, ${C.cardLight} 0%, ${C.card} 100%)`,
            position: 'relative',
          }}
        >
          {/* Верхняя линия — тонкая золотая полоска-акцент */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 20,
              right: 20,
              height: 1,
              background: `linear-gradient(90deg, transparent 0%, ${C.accentBorder} 30%, ${C.accent} 50%, ${C.accentBorder} 70%, transparent 100%)`,
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            {/* Название + цена в одну строку */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  margin: 0,
                  lineHeight: 1.15,
                  color: C.text,
                  letterSpacing: '-0.02em',
                }}
              >
                {ad.brand} {ad.model}
              </h1>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: C.accent,
                  marginTop: 6,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  textShadow: `0 0 30px ${C.accentGlow}`,
                }}
              >
                {formatPrice(ad.price)}
              </div>
            </div>

            {/* Избранное + просмотры */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              <motion.button
                whileTap={{ scale: 0.8 }}
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                style={{
                  background: isFavorite ? C.accentDim : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isFavorite ? C.accentBorder : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 12,
                  width: 40,
                  height: 40,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: favoriteLoading ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {isFavorite ? (
                  <Star size={20} weight="Bold" color={C.accent} />
                ) : (
                  <Star size={20} weight="Linear" color={C.textSecondary} />
                )}
              </motion.button>
              <span
                style={{
                  fontSize: 11,
                  color: C.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontWeight: 500,
                }}
              >
                <Eye size={12} weight="BoldDuotone" color={C.textMuted} />
                {ad.view_count}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════
            ХАРАКТЕРИСТИКИ — премиальная сетка 2×N
            ═══════════════════════════════════════════════════ */}
        <motion.div
          variants={fadeUpItem}
          style={{
            padding: '16px 20px',
            background: C.bg,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}
          >
            {specs.map((spec, i) => (
              <div
                key={i}
                style={{
                  background: spec.highlight
                    ? `linear-gradient(135deg, ${C.greenDim} 0%, rgba(52,211,153,0.04) 100%)`
                    : `linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)`,
                  border: `1px solid ${spec.highlight ? 'rgba(52,211,153,0.15)' : C.border}`,
                  borderRadius: 14,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  ...(i === specs.length - 1 && specs.length % 2 !== 0
                    ? { gridColumn: '1 / -1' }
                    : {}),
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: spec.highlight ? C.greenDim : C.accentDim,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {spec.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: C.textMuted,
                      lineHeight: 1.2,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    {spec.label}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: spec.highlight ? C.green : C.text,
                      marginTop: 2,
                      lineHeight: 1.25,
                    }}
                  >
                    {spec.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════
            ОПИСАНИЕ
            ═══════════════════════════════════════════════════ */}
        {ad.description && (
          <motion.div
            variants={fadeUpItem}
            style={{
              padding: '0 20px',
              marginTop: 4,
            }}
          >
            <div
              style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: '16px 18px',
              }}
            >
              <h3
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: C.textMuted,
                  margin: '0 0 10px 0',
                }}
              >
                Описание
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: 'rgba(249, 250, 251, 0.82)',
                  whiteSpace: 'pre-line' as const,
                }}
              >
                {ad.description}
              </p>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════
            ДАТА ПУБЛИКАЦИИ
            ═══════════════════════════════════════════════════ */}
        {ad.created_at && (
          <motion.div
            variants={fadeUpItem}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '16px 20px 24px',
            }}
          >
            <ClockCircle size={13} weight="BoldDuotone" color={C.textMuted} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: C.textMuted,
                letterSpacing: '0.01em',
              }}
            >
              {formatDate(ad.created_at)}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          STICKY FOOTER — контакты
          ═══════════════════════════════════════════════════ */}
      <motion.div
        className="detail-footer"
        variants={footerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Кнопка «Показать» — телефон */}
        <button
          className="btn btn-gradient detail-footer__btn"
          onClick={() => {
            const raw = ad.contact_phone
            const digits = raw.replace(/\D/g, '')
            const formatted =
              digits.length === 11
                ? `${digits[0]}-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
                : raw
            navigator.clipboard?.writeText(formatted).catch(() => {})
            const wa = window.Telegram?.WebApp
            if ((wa as any)?.showPopup) {
              ;(wa as any).showPopup({
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

        {/* «Написать» — Telegram */}
        {adAny.author_username && (
          <button
            className="btn btn-secondary detail-footer__btn"
            onClick={() => {
              const wa = window.Telegram?.WebApp
              const url = `https://t.me/${adAny.author_username}`
              if ((wa as any)?.openTelegramLink)
                (wa as any).openTelegramLink(url)
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
