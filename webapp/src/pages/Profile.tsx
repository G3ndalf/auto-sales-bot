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
        <h2 className="text-[15px] font-semibold text-[var(--text-secondary,#8e8e93)] uppercase tracking-wide m-0 mb-3 ml-1">
          Мои объявления
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="bg-[var(--card-bg,#f2f2f7)] rounded-[14px] px-4 py-3.5 flex flex-col gap-1"
            >
              <span className="text-2xl font-bold text-[var(--text,#000)]">
                {stat.value}
              </span>
              <span className="text-[13px] text-[var(--text-secondary,#8e8e93)]">
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
            className="flex gap-2 mt-2.5 justify-center"
          >
            <span className="text-[13px] text-[var(--text-secondary,#8e8e93)] bg-[var(--card-bg,#f2f2f7)] rounded-[10px] px-3.5 py-1.5">
              🚗 Авто: {profile.ads.cars}
            </span>
            <span className="text-[13px] text-[var(--text-secondary,#8e8e93)] bg-[var(--card-bg,#f2f2f7)] rounded-[10px] px-3.5 py-1.5">
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
              <span className="ml-auto bg-[var(--accent,#6366f1)] text-white rounded-xl px-2.5 py-0.5 text-[13px] font-semibold">
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
