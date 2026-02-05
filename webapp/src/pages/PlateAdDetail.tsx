/**
 * PlateAdDetail.tsx — Детальная страница объявления номерного знака.
 *
 * Рефакторинг: анимации из animations.ts,
 * ContactFooter и FavoriteButton — shared компоненты,
 * formatPrice/formatDate — из utils/format.
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Hashtag } from '@solar-icons/react'
import { api } from '../api'
import type { PlateAdFull } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import PhotoGallery from '../components/PhotoGallery'
import ContactFooter from '../components/ContactFooter'
import FavoriteButton from '../components/FavoriteButton'
import { detailStagger, detailItem, soldBadgeScale } from '../constants/animations'
import { formatPrice, formatDate } from '../utils/format'

// ─────────────────────────────────────────────────────────────

export default function PlateAdDetail() {
  useBackButton()
  const { id } = useParams<{ id: string }>()
  const [ad, setAd] = useState<PlateAdFull | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.getPlateAd(Number(id)).then(data => {
      setAd(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) return null
  if (!ad) return <div className="loading">Объявление не найдено</div>

  return (
    <div className="detail-page">
      {/* Галерея фото — scroll-snap, НЕ ТРОГАЕМ */}
      <PhotoGallery
        photos={ad.photos.map(p => api.photoUrl(p))}
        alt={ad.plate_number}
        fallbackIcon={<Hashtag size={48} weight="BoldDuotone" className="opacity-30" />}
      />

      {/* Бейдж «Продано» — shared анимация soldBadgeScale */}
      {(ad as any).is_sold && (
        <motion.div
          className="sold-badge"
          variants={soldBadgeScale}
          initial="hidden"
          animate="visible"
        >
          Продано
        </motion.div>
      )}

      {/* ─── Stagger-контейнер — анимация из animations.ts ─── */}
      <motion.div
        variants={detailStagger}
        initial="hidden"
        animate="visible"
      >
        {/* Заголовок + цена + избранное + просмотры — компактный блок */}
        <motion.div variants={detailItem} style={{
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

          {/* Правая часть: избранное + просмотры — shared компонент */}
          <FavoriteButton adId={Number(id)} adType="plate" viewCount={ad.view_count} />
        </motion.div>

        {/* Город — один блок */}
        <motion.div variants={detailItem} style={{
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
          <motion.div variants={detailItem} className="detail-section">
            <h3>Описание</h3>
            <p className="detail-description">{ad.description}</p>
          </motion.div>
        )}

        {/* Дата публикации — formatDate с 'short' по умолчанию */}
        {ad.created_at && (
          <motion.p variants={detailItem} className="detail-date">
            Опубликовано: {formatDate(ad.created_at)}
          </motion.p>
        )}
      </motion.div>

      {/* Sticky-футер — shared компонент контактов */}
      <ContactFooter phone={ad.contact_phone} authorUsername={ad.author_username} />
    </div>
  )
}
