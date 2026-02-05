/**
 * CarAdDetail.tsx — Детальная страница объявления автомобиля.
 *
 * Рефакторинг: цвета из THEME, анимации из animations.ts,
 * ContactFooter и FavoriteButton — shared компоненты,
 * formatPrice/formatDate — из utils/format.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Garage,
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
import ContactFooter from '../components/ContactFooter'
import FavoriteButton from '../components/FavoriteButton'
import { THEME } from '../constants/theme'
import { detailStagger, detailItem, soldBadgeScale } from '../constants/animations'
import { formatPrice, formatDate } from '../utils/format'

// ─── Компонент ──────────────────────────────────────────────

export default function CarAdDetail() {
  useBackButton()
  const { id } = useParams<{ id: string }>()
  const [ad, setAd] = useState<CarAdFull | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) return null
  if (!ad) return <div className="loading">Объявление не найдено</div>

  // ─── Характеристики (только поля из формы) ─────────────────
  type SpecItem = {
    icon: React.ReactNode
    label: string
    value: string
    color: string       // цвет иконки и её фонового квадрата
    colorDim: string    // полупрозрачный фон квадрата
  }

  const specs: SpecItem[] = []

  if (ad.year > 0) {
    specs.push({
      icon: <CalendarMinimalistic size={18} weight="BoldDuotone" color="#3B82F6" />,
      label: 'Год выпуска',
      value: String(ad.year),
      color: '#3B82F6',
      colorDim: 'rgba(59, 130, 246, 0.12)',
    })
  }
  if (ad.mileage > 0) {
    specs.push({
      icon: <SpedometerMiddle size={18} weight="BoldDuotone" color="#F59E0B" />,
      label: 'Пробег',
      value: ad.mileage.toLocaleString('ru-RU') + ' км',
      color: '#F59E0B',
      colorDim: 'rgba(245, 158, 11, 0.12)',
    })
  }
  if (ad.transmission) {
    specs.push({
      icon: <Transmission size={18} weight="BoldDuotone" color="#8B5CF6" />,
      label: 'КПП',
      value: ad.transmission,
      color: '#8B5CF6',
      colorDim: 'rgba(139, 92, 246, 0.12)',
    })
  }
  if (ad.color) {
    specs.push({
      icon: <Palette size={18} weight="BoldDuotone" color="#EC4899" />,
      label: 'Цвет',
      value: ad.color,
      color: '#EC4899',
      colorDim: 'rgba(236, 72, 153, 0.12)',
    })
  }
  specs.push({
    icon: <MapPoint size={18} weight="BoldDuotone" color="#14B8A6" />,
    label: 'Город',
    value: ad.region ? `${ad.city}, ${ad.region}` : ad.city,
    color: '#14B8A6',
    colorDim: 'rgba(20, 184, 166, 0.12)',
  })

  // Cast ad для доступа к author_username и is_sold (приходят из API, но нет в типе)
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

      {/* ─── Бейдж «Продано» — shared анимация soldBadgeScale ─── */}
      {adAny.is_sold && (
        <motion.div
          className="sold-badge"
          variants={soldBadgeScale}
          initial="hidden"
          animate="visible"
        >
          Продано
        </motion.div>
      )}

      {/* ─── Основной контент — stagger-анимация из animations.ts ─── */}
      <motion.div variants={detailStagger} initial="hidden" animate="visible">
        {/* ═══════════════════════════════════════════════════
            HEADER: название + цена + избранное
            ═══════════════════════════════════════════════════ */}
        <motion.div
          variants={detailItem}
          style={{
            padding: '20px 20px 18px',
            background: `linear-gradient(180deg, ${THEME.cardLight} 0%, ${THEME.card} 100%)`,
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
              background: `linear-gradient(90deg, transparent 0%, ${THEME.accentBorder} 30%, ${THEME.accent} 50%, ${THEME.accentBorder} 70%, transparent 100%)`,
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
            {/* Название + цена */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  margin: 0,
                  lineHeight: 1.15,
                  color: THEME.text,
                  letterSpacing: '-0.02em',
                }}
              >
                {ad.brand} {ad.model}
              </h1>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: THEME.accent,
                  marginTop: 6,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  textShadow: `0 0 30px ${THEME.accentGlow}`,
                }}
              >
                {formatPrice(ad.price)}
              </div>
            </div>

            {/* Избранное + просмотры — shared компонент */}
            <FavoriteButton adId={Number(id)} adType="car" viewCount={ad.view_count} />
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════════
            ХАРАКТЕРИСТИКИ — премиальная сетка 2×N
            ═══════════════════════════════════════════════════ */}
        <motion.div
          variants={detailItem}
          style={{
            padding: '16px 20px',
            background: THEME.bg,
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
                  background: `linear-gradient(135deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.015) 100%)`,
                  border: `1px solid ${THEME.border}`,
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
                    background: spec.colorDim,
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
                      color: THEME.textMuted,
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
                      color: THEME.text,
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

          {/* ГБО — отдельный блок под сеткой */}
          {ad.has_gbo && (
            <div style={{
              marginTop: 10,
              background: `linear-gradient(135deg, ${THEME.greenDim} 0%, rgba(52,211,153,0.04) 100%)`,
              border: `1px solid rgba(52,211,153,0.15)`,
              borderRadius: 14,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: THEME.greenDim,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <GasStation size={18} weight="BoldDuotone" color={THEME.green} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: THEME.textMuted, letterSpacing: '0.02em', textTransform: 'uppercase' as const }}>ГБО</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.green, marginTop: 2 }}>Установлено</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ═══════════════════════════════════════════════════
            ОПИСАНИЕ
            ═══════════════════════════════════════════════════ */}
        {ad.description && (
          <motion.div
            variants={detailItem}
            style={{
              padding: '0 20px',
              marginTop: 4,
            }}
          >
            <div
              style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
                border: `1px solid ${THEME.border}`,
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
                  color: THEME.textMuted,
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
            ДАТА ПУБЛИКАЦИИ — formatDate 'long' (6 февраля 2026)
            ═══════════════════════════════════════════════════ */}
        {ad.created_at && (
          <motion.div
            variants={detailItem}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '16px 20px 24px',
            }}
          >
            <ClockCircle size={13} weight="BoldDuotone" color={THEME.textMuted} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: THEME.textMuted,
                letterSpacing: '0.01em',
              }}
            >
              {formatDate(ad.created_at, 'long')}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════
          STICKY FOOTER — shared компонент контактов
          ═══════════════════════════════════════════════════ */}
      <ContactFooter phone={ad.contact_phone} authorUsername={adAny.author_username} />
    </div>
  )
}
