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
    <div className="text-center px-4 py-15 text-[#9CA3AF] bg-[#111827] rounded-2xl">
      <motion.p
        className="text-5xl mb-3"
        animate={floatAnimation}
      >
        💔
      </motion.p>
      <p className="text-lg font-semibold">Нет избранных</p>
      <p className="mt-2">Нажмите ☆ на объявлении чтобы сохранить</p>
    </div>
  )

  return (
    <div className="min-h-screen pb-[100px]">
      <h1 className="text-[1.4em] font-extrabold px-4 pt-5 pb-3">
        ⭐ Избранное ({items.length})
      </h1>
      <div className="ads-list">
        {items.map((item, i) => (
          <motion.div
            key={`${item.ad_type}-${item.id}`}
            className="ad-card cursor-pointer"
            onClick={() => navigate(`/${item.ad_type}/${item.id}`)}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="ad-card-photo">
              {item.photo ? (
                <img src={api.photoUrl(item.photo)} alt="" />
              ) : (
                <div className="no-photo">{item.ad_type === 'car' ? '🚗' : '🔢'}</div>
              )}
            </div>
            <div className="ad-card-info">
              <div className="ad-card-title">{item.title}</div>
              <div className="ad-card-details">{item.city} · 👁 {item.view_count}</div>
              <div className="ad-card-price">{item.price.toLocaleString('ru-RU')} ₽</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
