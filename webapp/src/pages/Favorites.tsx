/**
 * Favorites.tsx — Страница избранных объявлений.
 * Показывает список сохранённых пользователем объявлений.
 * Карточки рендерятся через общий компонент AdCard.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { api } from '../api'
import type { FavoriteItem, FavoriteCarItem, FavoritePlateItem, FavoriteUnavailableItem } from '../api'
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

  // F8: Показать загрузку вместо пустого экрана
  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px 16px', color: '#9CA3AF', fontSize: 14 }}>
      Загрузка...
    </div>
  )

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
        {items.map((item) => {
          // F17: Unavailable item — показать заглушку
          if ('unavailable' in item && item.unavailable) {
            const unavail = item as FavoriteUnavailableItem
            return (
              <motion.div
                key={`unavail-${unavail.ad_type}-${unavail.id}`}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                style={{
                  margin: '0 12px 12px',
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#1F2937',
                  border: '1px solid #374151',
                  opacity: 0.6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#9CA3AF', fontSize: 14 }}>
                  {unavail.unavailable_reason || 'Объявление снято с публикации'}
                </span>
                <button
                  onClick={async () => {
                    try {
                      await api.removeFavorite(unavail.ad_type, unavail.id)
                      setItems(prev => prev.filter(i => !(i.ad_type === unavail.ad_type && i.id === unavail.id)))
                    } catch {}
                  }}
                  style={{
                    background: 'none', border: '1px solid #EF4444', borderRadius: 8,
                    color: '#EF4444', padding: '4px 12px', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Убрать
                </button>
              </motion.div>
            )
          }

          return item.ad_type === 'car' ? (
            <AdCard
              key={`car-${item.id}`}
              id={item.id}
              adType="car"
              price={item.price}
              city={item.city}
              photo={item.photo}
              viewCount={item.view_count}
              brand={(item as FavoriteCarItem).brand}
              model={(item as FavoriteCarItem).model}
              year={(item as FavoriteCarItem).year}
              mileage={(item as FavoriteCarItem).mileage}
              fuelType={(item as FavoriteCarItem).fuel_type}
              transmission={(item as FavoriteCarItem).transmission}
            />
          ) : (
            <AdCard
              key={`plate-${item.id}`}
              id={item.id}
              adType="plate"
              price={item.price}
              city={item.city}
              photo={item.photo}
              viewCount={item.view_count}
              plateNumber={(item as FavoritePlateItem).plate_number}
            />
          )
        })}
      </motion.div>
    </div>
  )
}
