/**
 * FavoriteButton.tsx — Кнопка избранного (звёздочка).
 *
 * Используется в: CarAdDetail, PlateAdDetail.
 * Заменяет дублированную логику toggleFavorite + рендер кнопки.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, Eye } from '@solar-icons/react'
import { api } from '../api'
import { THEME } from '../constants/theme'

interface FavoriteButtonProps {
  /** ID объявления */
  adId: number
  /** Тип объявления */
  adType: 'car' | 'plate'
  /** Количество просмотров (отображается под кнопкой) */
  viewCount: number
  /** Размер кнопки (default 40) */
  size?: number
}

export default function FavoriteButton({ adId, adType, viewCount, size = 40 }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)

  /* Проверяем при монтировании, есть ли объявление в избранном */
  useEffect(() => {
    api.getFavorites()
      .then(data => {
        const found = data.items.some(
          item => item.ad_type === adType && item.id === adId,
        )
        setIsFavorite(found)
      })
      .catch(() => {})
  }, [adId, adType])

  /** Переключить избранное */
  const toggle = async () => {
    setLoading(true)
    try {
      if (isFavorite) {
        await api.removeFavorite(adType, adId)
        setIsFavorite(false)
      } else {
        await api.addFavorite(adType, adId)
        setIsFavorite(true)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={toggle}
        disabled={loading}
        style={{
          background: isFavorite ? THEME.accentDim : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isFavorite ? THEME.accentBorder : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 12,
          width: size,
          height: size,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.5 : 1,
          transition: 'all 0.2s ease',
        }}
      >
        {isFavorite
          ? <Star size={20} weight="Bold" color={THEME.accent} />
          : <Star size={20} weight="Linear" color={THEME.textSecondary} />}
      </motion.button>

      <span style={{
        fontSize: 11, color: THEME.textMuted,
        display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500,
      }}>
        <Eye size={12} weight="BoldDuotone" color={THEME.textMuted} /> {viewCount}
      </span>
    </div>
  )
}
