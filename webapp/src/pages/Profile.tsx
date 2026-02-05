import { useState, useEffect } from 'react'
import { api, getUserId } from '../api'
import type { UserProfile } from '../api'

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

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
      {/* Hero */}
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

      {/* Stats */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat__value">{profile.ads.total}</span>
          <span className="profile-stat__label">Всего</span>
        </div>
        <div className="profile-stat profile-stat--active">
          <span className="profile-stat__value">{profile.ads.active}</span>
          <span className="profile-stat__label">Активных</span>
        </div>
        <div className="profile-stat profile-stat--pending">
          <span className="profile-stat__value">{profile.ads.pending}</span>
          <span className="profile-stat__label">На проверке</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="profile-section">
        <div className="profile-section__header">Мои объявления</div>
        <div className="profile-breakdown">
          <div className="profile-row">
            <span className="profile-row__icon">🚗</span>
            <span className="profile-row__label">Автомобили</span>
            <span className="profile-row__value">{profile.ads.cars}</span>
          </div>
          <div className="profile-row">
            <span className="profile-row__icon">🔢</span>
            <span className="profile-row__label">Номера</span>
            <span className="profile-row__value">{profile.ads.plates}</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="profile-section">
        <div className="profile-section__header">Быстрые действия</div>
        <div className="profile-actions">
          <a href="/car/new" className="profile-action">
            <span className="profile-action__icon">🚗</span>
            <span>Продать авто</span>
          </a>
          <a href="/plate/new" className="profile-action">
            <span className="profile-action__icon">🔢</span>
            <span>Продать номер</span>
          </a>
        </div>
      </div>
    </div>
  )
}
