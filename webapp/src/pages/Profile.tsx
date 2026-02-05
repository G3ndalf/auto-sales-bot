/**
 * Profile.tsx — Главная страница профиля пользователя.
 *
 * Показывает:
 * - Аватар, имя (редактируемое), username
 * - Дата регистрации
 * - Статистика объявлений: активные, на модерации, отклонённые, всего + разбивка авто/номера
 * - Кнопка "Мои объявления" (навигация на /my-ads)
 *
 * Анимации: scale-in аватар, stagger статистика (80ms), stagger кнопки
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, getUserId, ADMIN_IDS } from '../api'
import type { UserProfile } from '../api'
import { ClipboardList, Settings, CheckCircle, ClockCircle, CloseCircle, Chart, Garage, Hashtag, Pen } from '@solar-icons/react'

/* Варианты анимаций для stagger-контейнеров */
const staggerContainer = (staggerDelay = 0.03) => ({
  hidden: {},
  visible: { transition: { staggerChildren: staggerDelay } },
})

/* Элемент stagger — fade-in + slide-up */
const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
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

  /** Начать редактирование имени */
  const startEdit = () => {
    setEditName(profile?.name || '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  /** Сохранить имя */
  const saveName = async () => {
    const uid = getUserId()
    if (!uid || !editName.trim()) return

    setSaving(true)
    try {
      const result = await api.updateProfile(uid, editName.trim())
      if (result.ok && profile) {
        setProfile({ ...profile, name: result.name })
      }
    } catch { /* ignore */ }
    setSaving(false)
    setEditing(false)
  }

  /** Отмена редактирования */
  const cancelEdit = () => {
    setEditing(false)
    setEditName('')
  }

  if (loading) return null
  if (!profile) return null

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  const displayName = profile.name || tgUser?.first_name || 'Пользователь'
  const avatar = displayName.charAt(0).toUpperCase()

  /** Статистика объявлений с цветовой кодировкой фона */
  const stats = [
    { value: profile.ads.active, label: <><CheckCircle size={14} weight="BoldDuotone" /> Активных</>, bg: 'rgba(34, 197, 94, 0.12)', color: '#22C55E', valueColor: '#4ADE80' },
    { value: profile.ads.pending, label: <><ClockCircle size={14} weight="BoldDuotone" /> На модерации</>, bg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', valueColor: '#FBBF24' },
    { value: profile.ads.rejected, label: <><CloseCircle size={14} weight="BoldDuotone" /> Отклонённых</>, bg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', valueColor: '#F87171' },
    { value: profile.ads.total, label: <><Chart size={14} weight="BoldDuotone" /> Всего</>, bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', valueColor: '#60A5FA' },
  ]

  return (
    <div className="profile-page">
      {/* Hero — аватар, имя (редактируемое), дата регистрации */}
      <motion.div
        className="profile-hero"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <div className="profile-avatar">{avatar}</div>

        {/* Имя с кнопкой редактирования */}
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 8 }}
            >
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={100}
                placeholder="Ваше имя"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: '8px 16px',
                  borderRadius: 12,
                  border: '1px solid #374151',
                  background: '#1F2937',
                  color: '#F9FAFB',
                  outline: 'none',
                  width: '80%',
                  maxWidth: 240,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={saveName}
                  disabled={saving || !editName.trim()}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#F59E0B',
                    color: '#0B0F19',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: saving || !editName.trim() ? 0.5 : 1,
                  }}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: '1px solid #374151',
                    background: 'transparent',
                    color: '#9CA3AF',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="display"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <h1 className="profile-name" style={{ margin: 0 }}>{displayName}</h1>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={startEdit}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: 'none',
                  borderRadius: 8,
                  padding: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Pen size={14} weight="BoldDuotone" color="#F59E0B" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {profile.username && (
          <p className="profile-username">@{profile.username}</p>
        )}
        {profile.member_since && (
          <p className="profile-since">На платформе с {profile.member_since}</p>
        )}
      </motion.div>

      {/* Статистика объявлений — stagger появление с задержкой 80ms */}
      <div className="profile-section">
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 4px' }}>
          Мои объявления
        </h2>
        <motion.div
          variants={staggerContainer(0.03)}
          initial="hidden"
          animate="visible"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
        >
          {stats.map((stat) => (
            <motion.div
              key={String(stat.label)}
              variants={staggerItem}
              style={{ background: stat.bg, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, border: `1px solid ${stat.color}22` }}
            >
              <span style={{ fontSize: 24, fontWeight: 700, color: stat.valueColor, lineHeight: 1.2 }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 13, color: stat.color, lineHeight: 1.3 }}>
                {stat.label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Разбивка по типу: авто / номера */}
        {profile.ads.total > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.2 }}
            style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}
          >
            <span style={{ fontSize: 13, color: '#9CA3AF', background: '#1A2332', borderRadius: 10, padding: '6px 14px' }}>
              <Garage size={14} weight="BoldDuotone" /> Авто: {profile.ads.cars}
            </span>
            <span style={{ fontSize: 13, color: '#9CA3AF', background: '#1A2332', borderRadius: 10, padding: '6px 14px' }}>
              <Hashtag size={14} weight="BoldDuotone" /> Номера: {profile.ads.plates}
            </span>
          </motion.div>
        )}
      </div>

      {/* Кнопки — stagger fade-in после статистики */}
      <div className="profile-section">
        <motion.div
          className="profile-actions"
          variants={staggerContainer(0.03)}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            className="profile-action"
            variants={staggerItem}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/my-ads')}
          >
            <ClipboardList size={20} weight="BoldDuotone" />
            <span>Мои объявления</span>
            {profile.ads.total > 0 && (
              <span style={{ marginLeft: 'auto', background: '#F59E0B', color: '#0B0F19', borderRadius: 12, padding: '2px 10px', fontSize: 13, fontWeight: 600 }}>
                {profile.ads.total}
              </span>
            )}
          </motion.div>
          {/* Админ-панель — только для администраторов */}
          {ADMIN_IDS.includes(Number(getUserId())) && (
            <motion.div
              className="profile-action"
              variants={staggerItem}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/admin-panel')}
            >
              <Settings size={20} weight="BoldDuotone" />
              <span>Админ-панель</span>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
