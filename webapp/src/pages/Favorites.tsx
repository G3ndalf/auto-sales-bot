/**
 * Favorites.tsx — Страница избранных объявлений.
 * Показывает список сохранённых пользователем объявлений.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api'
import type { FavoriteItem } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import { SkeletonList } from '../components/Skeleton'
import { Star, HeartBroken, Garage, Hashtag, MapPoint, Eye } from '@solar-icons/react'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' },
  }),
}

const floatAnimation = {
  y: [0, -10, 0],
  transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
}

export default function Favorites() {
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  useBackButton('/')

  useEffect(() => {
    api.getFavorites()
      .then(data => setItems(data.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <SkeletonList count={3} />

  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 16px', color: '#9CA3AF' }}>
      <motion.div
        style={{ marginBottom: 12 }}
        animate={floatAnimation}
      >
        <HeartBroken size={48} weight="BoldDuotone" />
      </motion.div>
      <p style={{ fontSize: 18, fontWeight: 600 }}>Нет избранных</p>
      <p style={{ marginTop: 8 }}>Нажмите ☆ на объявлении чтобы сохранить</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <h1 style={{ fontSize: '1.4em', fontWeight: 800, padding: '20px 16px 12px' }}>
        <Star size={20} weight="BoldDuotone" /> Избранное ({items.length})
      </h1>
      <div className="ads-list">
        {items.map((item, i) => (
          <motion.div
            key={`${item.ad_type}-${item.id}`}
            className="ad-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/${item.ad_type}/${item.id}`)}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="ad-card-photo">
              {item.photo ? (
                <img src={api.photoUrl(item.photo)} alt="" loading="lazy" />
              ) : (
                <div className="no-photo">{item.ad_type === 'car' ? <Garage weight="BoldDuotone" /> : <Hashtag weight="BoldDuotone" />}</div>
              )}
            </div>
            <div className="ad-card-info">
              <div className="ad-card-title">{item.title}</div>
              <div className="ad-card-location">
                <MapPoint size={14} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} /> {item.city}
                <span style={{ color: '#9CA3AF', fontSize: '0.85em', marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 2, verticalAlign: 'middle' }}>
                  <Eye size={14} weight="BoldDuotone" /> {item.view_count}
                </span>
              </div>
              <div className="ad-card-price">{item.price.toLocaleString('ru-RU')} ₽</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
