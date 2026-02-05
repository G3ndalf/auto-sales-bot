/**
 * Favorites.tsx — Страница избранных объявлений.
 * Показывает список сохранённых пользователем объявлений.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { FavoriteItem } from '../api'
import { useBackButton } from '../hooks/useBackButton'

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

  if (loading) return <div className="loading">Загрузка...</div>

  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--hint)' }}>
      <p style={{ fontSize: '3em', marginBottom: '12px' }}>💔</p>
      <p style={{ fontSize: '1.1em', fontWeight: 600 }}>Нет избранных</p>
      <p style={{ marginTop: '8px' }}>Нажмите ☆ на объявлении чтобы сохранить</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      <h1 style={{ fontSize: '1.4em', fontWeight: 800, padding: '20px 16px 12px' }}>
        ⭐ Избранное ({items.length})
      </h1>
      <div className="ads-list">
        {items.map(item => (
          <div
            key={`${item.ad_type}-${item.id}`}
            className="ad-card"
            onClick={() => navigate(`/${item.ad_type}/${item.id}`)}
            style={{ cursor: 'pointer' }}
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
          </div>
        ))}
      </div>
    </div>
  )
}
