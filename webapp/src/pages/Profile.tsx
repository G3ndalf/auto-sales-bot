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
import { motion } from 'framer-motion'
import { api, getUserId, ADMIN_IDS } from '../api'
import type { UserProfile } from '../api'
import { SkeletonProfile } from '../components/Skeleton'

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

  if (loading) return <SkeletonProfile />
  if (!profile) return null

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  const displayName = tgUser?.first_name || profile.name
  const avatar = displayName.charAt(0).toUpperCase()

  const stats = [
    { value: profile.ads.active, label: '🟢 Активных' },
    { value: profile.ads.pending, label: '🟡 На модерации' },
    { value: profile.ads.rejected, label: '🔴 Отклонённых' },
    { value: profile.ads.total, label: '📊 Всего' },
  ]

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
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 4px' }}>
          Мои объявления
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              style={{ background: '#1A2332', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <span style={{ fontSize: 24, fontWeight: 700, color: '#F9FAFB', lineHeight: 1.2 }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.3 }}>
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Разбивка по типу: авто / номера */}
        {profile.ads.total > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}
          >
            <span style={{ fontSize: 13, color: '#9CA3AF', background: '#1A2332', borderRadius: 10, padding: '6px 14px' }}>
              🚗 Авто: {profile.ads.cars}
            </span>
            <span style={{ fontSize: 13, color: '#9CA3AF', background: '#1A2332', borderRadius: 10, padding: '6px 14px' }}>
              🔢 Номера: {profile.ads.plates}
            </span>
          </motion.div>
        )}
      </div>

      {/* Кнопка — переход к объявлениям */}
      <div className="profile-section">
        <div className="profile-actions">
          <div className="profile-action" onClick={() => navigate('/my-ads')}>
            <span className="profile-action__icon">📋</span>
            <span>Мои объявления</span>
            {profile.ads.total > 0 && (
              <span style={{ marginLeft: 'auto', background: '#F59E0B', color: '#0B0F19', borderRadius: 12, padding: '2px 10px', fontSize: 13, fontWeight: 600 }}>
                {profile.ads.total}
              </span>
            )}
          </div>
          <div className="profile-action" onClick={() => navigate('/favorites')}>
            <span className="profile-action__icon">⭐</span>
            <span>Избранное</span>
          </div>
          {/* Админ-панель — только для администраторов */}
          {ADMIN_IDS.includes(Number(getUserId())) && (
            <div className="profile-action" onClick={() => navigate('/admin')}>
              <span className="profile-action__icon">⚙️</span>
              <span>Админ-панель</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
