/**
 * Profile.tsx — Главная страница профиля пользователя.
 *
 * Показывает:
 * - Аватар, имя, username
 * - Дата регистрации
 * - Статистика объявлений: активные, на модерации, отклонённые, всего + разбивка авто/номера
 * - Кнопка "Мои объявления" (навигация на /my-ads)
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

      {/* Статистика объявлений */}
      <div className="profile-section">
        <h2 style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-secondary, #8e8e93)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: '0 0 12px 4px',
        }}>Мои объявления</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
        }}>
          {/* Активные */}
          <div style={{
            background: 'var(--card-bg, #f2f2f7)',
            borderRadius: '14px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text, #000)' }}>
              {profile.ads.active}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #8e8e93)' }}>
              🟢 Активных
            </span>
          </div>
          {/* На модерации */}
          <div style={{
            background: 'var(--card-bg, #f2f2f7)',
            borderRadius: '14px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text, #000)' }}>
              {profile.ads.pending}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #8e8e93)' }}>
              🟡 На модерации
            </span>
          </div>
          {/* Отклонённые */}
          <div style={{
            background: 'var(--card-bg, #f2f2f7)',
            borderRadius: '14px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text, #000)' }}>
              {profile.ads.rejected}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #8e8e93)' }}>
              🔴 Отклонённых
            </span>
          </div>
          {/* Всего */}
          <div style={{
            background: 'var(--card-bg, #f2f2f7)',
            borderRadius: '14px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text, #000)' }}>
              {profile.ads.total}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary, #8e8e93)' }}>
              📊 Всего
            </span>
          </div>
        </div>

        {/* Разбивка по типу: авто / номера */}
        {profile.ads.total > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '10px',
            justifyContent: 'center',
          }}>
            <span style={{
              fontSize: '13px',
              color: 'var(--text-secondary, #8e8e93)',
              background: 'var(--card-bg, #f2f2f7)',
              borderRadius: '10px',
              padding: '6px 14px',
            }}>
              🚗 Авто: {profile.ads.cars}
            </span>
            <span style={{
              fontSize: '13px',
              color: 'var(--text-secondary, #8e8e93)',
              background: 'var(--card-bg, #f2f2f7)',
              borderRadius: '10px',
              padding: '6px 14px',
            }}>
              🔢 Номера: {profile.ads.plates}
            </span>
          </div>
        )}
      </div>

      {/* Кнопка — переход к объявлениям */}
      <div className="profile-section">
        <div className="profile-actions">
          <div className="profile-action" onClick={() => navigate('/my-ads')}>
            <span className="profile-action__icon">📋</span>
            <span>Мои объявления</span>
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
          <div className="profile-action" onClick={() => navigate('/favorites')}>
            <span className="profile-action__icon">⭐</span>
            <span>Избранное</span>
          </div>
        </div>
      </div>
    </div>
  )
}
