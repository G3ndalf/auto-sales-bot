/**
 * Favorites.tsx — Страница избранных объявлений.
 * Показывает список сохранённых пользователем объявлений.
 * Карточки рендерятся через общий компонент AdCard.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api'
import type { FavoriteItem } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import { Star, HeartBroken } from '@solar-icons/react'
import { listStagger, floatLoop } from '../constants/animations'
import AdCard from '../components/AdCard'

export default function Favorites() {
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  useBackButton('/')

  useEffect(() => {
    api.getFavorites()
      .then(data => setItems(data.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null

  if (items.length === 0) return (
    /* Мягкое fade-in для пустого состояния с плавающей иконкой */
    <motion.div
      style={{ textAlign: 'center', padding: '60px 16px', color: '#9CA3AF' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        style={{ marginBottom: 12 }}
        animate={floatLoop}
      >
        <HeartBroken size={48} weight="BoldDuotone" />
      </motion.div>
      <p style={{ fontSize: 18, fontWeight: 600 }}>Нет избранных</p>
      <p style={{ marginTop: 8 }}>Нажмите ☆ на объявлении чтобы сохранить</p>
    </motion.div>
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 100 }}>
      <h1 style={{ fontSize: '1.4em', fontWeight: 800, padding: '20px 16px 12px' }}>
        <Star size={20} weight="BoldDuotone" /> Избранное ({items.length})
      </h1>
      {/* Stagger-контейнер: карточки появляются одна за другой через AdCard */}
      <motion.div
        className="ads-list"
        variants={listStagger}
        initial="hidden"
        animate="visible"
      >
        {items.map((item) => (
          <AdCard
            key={`${item.ad_type}-${item.id}`}
            id={item.id}
            adType={item.ad_type}
            price={item.price}
            city={item.city}
            photo={item.photo}
            viewCount={item.view_count}
            title={item.title}
          />
        ))}
      </motion.div>
    </div>
  )
}
