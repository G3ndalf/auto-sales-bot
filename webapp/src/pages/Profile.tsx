/**
 * Profile.tsx — Главная страница профиля пользователя.
 *
 * Показывает:
 * - Аватар, имя, username
 * - Дата регистрации
 * - Кнопка "Мои объявления" (навигация на /my-ads)
 *
 * Статистика по объявлениям и кнопки продажи убраны —
 * статистика есть в "Мои объявления", продажа — в докбаре.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getUserId } from '../api'
import type { UserProfile } from '../api'

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const uid = getUserId()
    if (!uid) {
      setProfile({
        name: 'Пользователь',
        username: null,
        member_since: null,
        ads: { total: 0, active: 0, pending: 0, rejected: 0, cars: 0, plates: 0 },
      })
      setLoading(false)
      return
    }

    api.getProfile(uid)
      .then(data => setProfile(data))
      .catch(() => setProfile({
        name: 'Пользователь',
        username: null,
        member_since: null,
        ads: { total: 0, active: 0, pending: 0, rejected: 0, cars: 0, plates: 0 },
      }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">Загрузка...</div>
  if (!profile) return null

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  const displayName = tgUser?.first_name || profile.name
  const avatar = displayName.charAt(0).toUpperCase()

  return (
    <div className="profile-page">
      {/* Hero — аватар, имя, дата регистрации */}
      <div className="profile-hero">
        <div className="profile-avatar">{avatar}</div>
        <h1 className="profile-name">{displayName}</h1>
        {profile.username && (
          <p className="profile-username">@{profile.username}</p>
        )}
        {profile.member_since && (
          <p className="profile-since">На платформе с {profile.member_since}</p>
        )}
      </div>

      {/* Единственная кнопка — переход к объявлениям */}
      <div className="profile-section">
        <div className="profile-actions">
          <div className="profile-action" onClick={() => navigate('/my-ads')}>
            <span className="profile-action__icon">📋</span>
            <span>Мои объявления</span>
            {/* Бейдж с общим количеством объявлений */}
            {profile.ads.total > 0 && (
              <span style={{
                marginLeft: 'auto',
                backgroundColor: 'var(--accent, #6366f1)',
                color: '#fff',
                borderRadius: '12px',
                padding: '2px 10px',
                fontSize: '13px',
                fontWeight: 600,
              }}>
                {profile.ads.total}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
