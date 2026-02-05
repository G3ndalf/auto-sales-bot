/**
 * AdminPanel.tsx — Панель администратора.
 *
 * Вкладки: Модерация | Пользователи
 * Анимации: stagger статистика, stagger карточки модерации/пользователей,
 * whileTap кнопки одобрить/отклонить/бан
 *
 * v3: tabs fix
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Chart,
  ClockCircle,
  CheckCircle,
  CloseCircle,
  Garage,
  Hashtag,
  MapPoint,
  Phone,
  ChatRound,
  AddCircle,
  UsersGroupRounded,
  UserBlock,
  UserCheck,
  Magnifer,
} from '@solar-icons/react'
import { api } from '../api'
import type { AdminPendingAd, AdminStats, AdminUser, AdminUserDetail } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import { TEXTS } from '../constants/texts'

/* Stagger-контейнер для статистики */
const statsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

/* Stagger-контейнер для карточек модерации */
const adsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

/* Элемент stagger — fade-in + slide-up */
const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

type TabType = 'moderation' | 'users'

export default function AdminPanel() {
  useBackButton('/')
  console.log('[AdminPanel] v3 with tabs: Moderation | Users')
  const [activeTab, setActiveTab] = useState<TabType>('moderation')

  // === Moderation state ===
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [ads, setAds] = useState<AdminPendingAd[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generatedInfo, setGeneratedInfo] = useState<string | null>(null)

  // === Users state ===
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersSearch, setUsersSearch] = useState('')
  const [userBanLoading, setUserBanLoading] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null)
  const [userDetailLoading, setUserDetailLoading] = useState(false)

  // Debounce ref
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadModerationData = useCallback(async () => {
    try {
      const [statsData, pendingData] = await Promise.all([
        api.adminGetStats(),
        api.adminGetPending(),
      ])
      setStats(statsData)
      setAds(pendingData.items)
      setError(null)
    } catch {
      setError(TEXTS.ADMIN_ACCESS_DENIED)
    }
    setLoading(false)
  }, [])

  const loadUsers = useCallback(async (query: string) => {
    setUsersLoading(true)
    try {
      const data = await api.adminGetUsers(query || undefined, 0, 50)
      setUsers(data.items)
      setUsersTotal(data.total)
    } catch {
      setUsers([])
      setUsersTotal(0)
    }
    setUsersLoading(false)
  }, [])

  useEffect(() => {
    loadModerationData()
  }, [loadModerationData])

  // Load users when switching to users tab
  useEffect(() => {
    if (activeTab === 'users' && users.length === 0 && !usersLoading) {
      loadUsers('')
    }
  }, [activeTab, users.length, usersLoading, loadUsers])

  // Debounced search
  useEffect(() => {
    if (activeTab !== 'users') return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadUsers(usersSearch)
    }, 400)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [usersSearch, activeTab, loadUsers])

  const handleApprove = async (ad: AdminPendingAd) => {
    const key = `${ad.ad_type}-${ad.id}`
    setActionLoading(key)
    try {
      await api.adminApprove(ad.ad_type, ad.id)
      setAds(prev => prev.filter(a => !(a.ad_type === ad.ad_type && a.id === ad.id)))
      setStats(prev =>
        prev
          ? {
              ...prev,
              pending: prev.pending - 1,
              approved: prev.approved + 1,
            }
          : prev
      )
    } catch {
      setError(TEXTS.ADMIN_ERROR)
    }
    setActionLoading(null)
  }

  const handleReject = async (ad: AdminPendingAd) => {
    const key = `${ad.ad_type}-${ad.id}`
    setActionLoading(key)
    try {
      await api.adminReject(ad.ad_type, ad.id)
      setAds(prev => prev.filter(a => !(a.ad_type === ad.ad_type && a.id === ad.id)))
      setStats(prev =>
        prev
          ? {
              ...prev,
              pending: prev.pending - 1,
              rejected: prev.rejected + 1,
            }
          : prev
      )
    } catch {
      setError(TEXTS.ADMIN_ERROR)
    }
    setActionLoading(null)
  }

  /** Сгенерировать тестовое объявление с рандомными данными */
  const handleGenerate = async () => {
    setGenerating(true)
    setGeneratedInfo(null)
    try {
      const result = await api.adminGenerateAd()
      if (result.ok && result.ad) {
        const { title, price, city, photos_attached } = result.ad
        setGeneratedInfo(
          `${title} — ${price.toLocaleString('ru-RU')} ₽, ${city} (фото: ${photos_attached})`
        )
        // Обновить статистику
        setStats(prev =>
          prev ? { ...prev, total: prev.total + 1, approved: prev.approved + 1 } : prev
        )
      }
    } catch {
      setError(TEXTS.ADMIN_ERROR)
    }
    setGenerating(false)
  }

  const handleBanToggle = async (user: AdminUser) => {
    setUserBanLoading(user.telegram_id)
    try {
      if (user.is_banned) {
        await api.adminUnbanUser(user.telegram_id)
      } else {
        await api.adminBanUser(user.telegram_id)
      }
      // Update local state
      setUsers(prev =>
        prev.map(u =>
          u.telegram_id === user.telegram_id ? { ...u, is_banned: !u.is_banned } : u
        )
      )
    } catch {
      setError(TEXTS.ADMIN_ERROR)
    }
    setUserBanLoading(null)
  }

  const handleUserClick = async (user: AdminUser) => {
    setUserDetailLoading(true)
    try {
      const detail = await api.adminGetUserDetail(user.telegram_id)
      setSelectedUser(detail)
    } catch {
      setError(TEXTS.ADMIN_ERROR)
    }
    setUserDetailLoading(false)
  }

  const closeModal = () => {
    setSelectedUser(null)
  }

  const formatPrice = (n: number) => n.toLocaleString('ru-RU') + ' ₽'

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (loading) return <div className="loading">Загрузка...</div>
  if (error && !stats) return <div className="loading">{error}</div>

  return (
    <div className="admin-page">
      <h1>{TEXTS.ADMIN_TITLE} <span style={{ fontSize: '12px', opacity: 0.5 }}>v4</span></h1>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '12px',
        }}
      >
        <motion.button
          onClick={() => setActiveTab('moderation')}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'moderation' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeTab === 'moderation' ? '#F59E0B' : 'rgba(255,255,255,0.6)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderBottom: activeTab === 'moderation' ? '2px solid #F59E0B' : '2px solid transparent',
          }}
        >
          <ClockCircle size={18} weight="BoldDuotone" />
          {TEXTS.ADMIN_TAB_MODERATION}
        </motion.button>
        <motion.button
          onClick={() => setActiveTab('users')}
          whileTap={{ scale: 0.95 }}
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'users' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: activeTab === 'users' ? '#F59E0B' : 'rgba(255,255,255,0.6)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderBottom: activeTab === 'users' ? '2px solid #F59E0B' : '2px solid transparent',
          }}
        >
          <UsersGroupRounded size={18} weight="BoldDuotone" />
          {TEXTS.ADMIN_TAB_USERS}
        </motion.button>
      </div>

      {/* Error toast */}
      {error && <div className="admin-error">{error}</div>}

      {/* ===== Moderation Tab ===== */}
      {activeTab === 'moderation' && (
        <>
          {/* Статистика — stagger появление блоков */}
          {stats && (
            <motion.div
              className="admin-stats"
              variants={statsContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.div className="stat-card" variants={fadeInUp}>
                <Chart size={20} weight="BoldDuotone" style={{ marginBottom: 4 }} />
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">{TEXTS.ADMIN_STATS_TOTAL}</div>
              </motion.div>
              <motion.div className="stat-card stat-pending" variants={fadeInUp}>
                <ClockCircle size={20} weight="BoldDuotone" style={{ marginBottom: 4 }} />
                <div className="stat-value">{stats.pending}</div>
                <div className="stat-label">{TEXTS.ADMIN_STATS_PENDING}</div>
              </motion.div>
              <motion.div className="stat-card stat-approved" variants={fadeInUp}>
                <CheckCircle size={20} weight="BoldDuotone" style={{ marginBottom: 4 }} />
                <div className="stat-value">{stats.approved}</div>
                <div className="stat-label">{TEXTS.ADMIN_STATS_APPROVED}</div>
              </motion.div>
              <motion.div className="stat-card stat-rejected" variants={fadeInUp}>
                <CloseCircle size={20} weight="BoldDuotone" style={{ marginBottom: 4 }} />
                <div className="stat-value">{stats.rejected}</div>
                <div className="stat-label">{TEXTS.ADMIN_STATS_REJECTED}</div>
              </motion.div>
            </motion.div>
          )}

          {/* Кнопка генерации тестового объявления */}
          <div style={{ margin: '16px 0' }}>
            <motion.button
              onClick={handleGenerate}
              disabled={generating}
              whileTap={{ scale: 0.95 }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: '#0B0F19',
                fontWeight: 600,
                fontSize: '15px',
                cursor: generating ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: generating ? 0.7 : 1,
              }}
            >
              <AddCircle size={20} weight="BoldDuotone" />
              {generating ? 'Генерация...' : 'Сгенерировать объявление'}
            </motion.button>

            {/* Результат генерации */}
            {generatedInfo && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#22C55E',
                  fontSize: '13px',
                  lineHeight: 1.4,
                }}
              >
                {generatedInfo}
              </motion.div>
            )}
          </div>

          {/* Pending ads */}
          <h2 className="admin-section-title">
            {TEXTS.ADMIN_STATS_PENDING} ({ads.length})
          </h2>

          {ads.length === 0 ? (
            <div className="empty-state">
              <p>{TEXTS.ADMIN_NO_PENDING}</p>
            </div>
          ) : (
            <motion.div
              className="admin-ads-list"
              variants={adsContainer}
              initial="hidden"
              animate="visible"
            >
              {ads.map(ad => {
                const key = `${ad.ad_type}-${ad.id}`
                const isProcessing = actionLoading === key
                return (
                  <motion.div className="admin-ad-card" key={key} variants={fadeInUp}>
                    {/* Badge */}
                    <div
                      className={`admin-ad-badge ${ad.ad_type === 'car' ? 'badge-car' : 'badge-plate'}`}
                    >
                      {ad.ad_type === 'car' ? TEXTS.ADMIN_CAR_LABEL : TEXTS.ADMIN_PLATE_LABEL}
                    </div>

                    {/* Photo */}
                    <div className="admin-ad-photo">
                      {ad.photo ? (
                        <img src={api.photoUrl(ad.photo)} alt="" />
                      ) : (
                        <div className="no-photo">
                          {ad.ad_type === 'car' ? (
                            <Garage size={24} weight="BoldDuotone" />
                          ) : (
                            <Hashtag size={24} weight="BoldDuotone" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="admin-ad-info">
                      <div className="admin-ad-title">{ad.title}</div>
                      <div className="admin-ad-price">{formatPrice(ad.price)}</div>

                      {ad.ad_type === 'car' && (
                        <div className="admin-ad-details">
                          {ad.mileage?.toLocaleString('ru-RU')} км
                          {' · '}
                          {ad.fuel_type}
                          {' · '}
                          {ad.transmission}
                          {ad.color ? ` · ${ad.color}` : ''}
                          {ad.engine_volume ? ` · ${ad.engine_volume}л` : ''}
                        </div>
                      )}

                      <div className="admin-ad-meta">
                        <MapPoint
                          size={14}
                          weight="BoldDuotone"
                          style={{ display: 'inline', verticalAlign: 'middle' }}
                        />{' '}
                        {ad.city}
                      </div>

                      {ad.description && (
                        <div className="admin-ad-desc">
                          {ad.description.length > 150
                            ? ad.description.slice(0, 150) + '...'
                            : ad.description}
                        </div>
                      )}

                      <div className="admin-ad-contacts">
                        <Phone
                          size={14}
                          weight="BoldDuotone"
                          style={{ display: 'inline', verticalAlign: 'middle' }}
                        />{' '}
                        {ad.contact_phone}
                        {ad.contact_telegram && (
                          <>
                            {' '}
                            ·{' '}
                            <ChatRound
                              size={14}
                              weight="BoldDuotone"
                              style={{ display: 'inline', verticalAlign: 'middle' }}
                            />{' '}
                            {ad.contact_telegram}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Кнопки одобрить/отклонить — whileTap с визуальным feedback */}
                    <div className="admin-ad-actions">
                      <motion.button
                        className="btn-approve"
                        onClick={() => handleApprove(ad)}
                        disabled={isProcessing}
                        whileTap={{ scale: 0.9 }}
                      >
                        {isProcessing ? (
                          '...'
                        ) : (
                          <>
                            <CheckCircle size={16} weight="BoldDuotone" />{' '}
                            {TEXTS.ADMIN_BTN_APPROVE}
                          </>
                        )}
                      </motion.button>
                      <motion.button
                        className="btn-reject"
                        onClick={() => handleReject(ad)}
                        disabled={isProcessing}
                        whileTap={{ scale: 0.9 }}
                      >
                        {isProcessing ? (
                          '...'
                        ) : (
                          <>
                            <CloseCircle size={16} weight="BoldDuotone" />{' '}
                            {TEXTS.ADMIN_BTN_REJECT}
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </>
      )}

      {/* ===== Users Tab ===== */}
      {activeTab === 'users' && (
        <>
          {/* Search */}
          <div
            style={{
              position: 'relative',
              marginBottom: '16px',
            }}
          >
            <Magnifer
              size={20}
              weight="BoldDuotone"
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255,255,255,0.4)',
              }}
            />
            <input
              type="text"
              value={usersSearch}
              onChange={e => setUsersSearch(e.target.value)}
              placeholder={TEXTS.ADMIN_USERS_SEARCH}
              style={{
                width: '100%',
                padding: '12px 14px 12px 44px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Users list */}
          {usersLoading ? (
            <div className="loading" style={{ padding: '40px 0', textAlign: 'center' }}>
              Загрузка...
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <p>{TEXTS.ADMIN_USERS_EMPTY}</p>
            </div>
          ) : (
            <motion.div
              variants={adsContainer}
              initial="hidden"
              animate="visible"
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {users.map(user => {
                const isBanning = userBanLoading === user.telegram_id
                return (
                  <motion.div
                    key={user.telegram_id}
                    variants={fadeInUp}
                    onClick={() => handleUserClick(user)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '14px',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      border: user.is_banned
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid rgba(255,255,255,0.06)',
                      position: 'relative',
                    }}
                  >
                    {/* Avatar placeholder */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontSize: '18px',
                        fontWeight: 700,
                        color: '#0B0F19',
                      }}
                    >
                      {user.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '15px',
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {user.full_name || 'Без имени'}
                        </span>
                        {user.is_banned && (
                          <span
                            style={{
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#EF4444',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {TEXTS.ADMIN_USER_BANNED}
                          </span>
                        )}
                        {user.is_admin && (
                          <span
                            style={{
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: '#F59E0B',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            Admin
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.5)',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px 12px',
                        }}
                      >
                        {user.username && <span>@{user.username}</span>}
                        {user.phone && <span>{user.phone}</span>}
                        <span>
                          {user.ads_count} {TEXTS.ADMIN_USER_ADS}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.35)',
                          marginTop: '4px',
                        }}
                      >
                        {TEXTS.ADMIN_USER_SINCE} {formatDate(user.created_at)}
                      </div>
                    </div>

                    {/* Ban button */}
                    <motion.button
                      onClick={e => {
                        e.stopPropagation()
                        handleBanToggle(user)
                      }}
                      disabled={isBanning || user.is_admin}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: user.is_banned
                          ? 'rgba(34, 197, 94, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                        color: user.is_banned ? '#22C55E' : '#EF4444',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: isBanning || user.is_admin ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: user.is_admin ? 0.3 : isBanning ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {isBanning ? (
                        '...'
                      ) : user.is_banned ? (
                        <>
                          <UserCheck size={16} weight="BoldDuotone" />
                          {TEXTS.ADMIN_USER_UNBAN}
                        </>
                      ) : (
                        <>
                          <UserBlock size={16} weight="BoldDuotone" />
                          {TEXTS.ADMIN_USER_BAN}
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {/* Total count */}
          {!usersLoading && users.length > 0 && (
            <div
              style={{
                textAlign: 'center',
                marginTop: '16px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Показано {users.length} из {usersTotal}
            </div>
          )}
        </>
      )}

      {/* ===== User Detail Modal ===== */}
      <AnimatePresence>
        {(selectedUser || userDetailLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#0B0F19',
                borderRadius: '20px',
                padding: '24px',
                maxWidth: '400px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {userDetailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.5)' }}>
                  Загрузка...
                </div>
              ) : selectedUser ? (
                <>
                  {/* User header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#0B0F19',
                      }}
                    >
                      {selectedUser.user.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '18px', color: '#fff' }}>
                        {selectedUser.user.full_name || 'Без имени'}
                      </div>
                      {selectedUser.user.username && (
                        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                          @{selectedUser.user.username}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User info */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      padding: '14px',
                      marginBottom: '20px',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {selectedUser.user.phone && <div>📱 {selectedUser.user.phone}</div>}
                    <div>📅 {TEXTS.ADMIN_USER_SINCE} {formatDate(selectedUser.user.created_at)}</div>
                    <div>📝 {selectedUser.user.ads_count} {TEXTS.ADMIN_USER_ADS}</div>
                    {selectedUser.user.is_banned && (
                      <div style={{ color: '#EF4444' }}>🚫 {TEXTS.ADMIN_USER_BANNED}</div>
                    )}
                  </div>

                  {/* Cars */}
                  {selectedUser.cars.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#F59E0B',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Garage size={18} weight="BoldDuotone" />
                        Авто ({selectedUser.cars.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedUser.cars.map(car => (
                          <div
                            key={car.id}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontSize: '13px', color: '#fff' }}>{car.title}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 600 }}>
                                {formatPrice(car.price)}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background:
                                    car.status === 'approved'
                                      ? 'rgba(34, 197, 94, 0.2)'
                                      : car.status === 'pending'
                                      ? 'rgba(245, 158, 11, 0.2)'
                                      : 'rgba(239, 68, 68, 0.2)',
                                  color:
                                    car.status === 'approved'
                                      ? '#22C55E'
                                      : car.status === 'pending'
                                      ? '#F59E0B'
                                      : '#EF4444',
                                }}
                              >
                                {car.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Plates */}
                  {selectedUser.plates.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#F59E0B',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Hashtag size={18} weight="BoldDuotone" />
                        Номера ({selectedUser.plates.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedUser.plates.map(plate => (
                          <div
                            key={plate.id}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontSize: '13px', color: '#fff' }}>{plate.title}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 600 }}>
                                {formatPrice(plate.price)}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background:
                                    plate.status === 'approved'
                                      ? 'rgba(34, 197, 94, 0.2)'
                                      : plate.status === 'pending'
                                      ? 'rgba(245, 158, 11, 0.2)'
                                      : 'rgba(239, 68, 68, 0.2)',
                                  color:
                                    plate.status === 'approved'
                                      ? '#22C55E'
                                      : plate.status === 'pending'
                                      ? '#F59E0B'
                                      : '#EF4444',
                                }}
                              >
                                {plate.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {selectedUser.cars.length === 0 && selectedUser.plates.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '20px 0' }}>
                      Нет объявлений
                    </div>
                  )}

                  {/* Close button */}
                  <motion.button
                    onClick={closeModal}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      width: '100%',
                      marginTop: '20px',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'transparent',
                      color: 'rgba(255,255,255,0.6)',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Закрыть
                  </motion.button>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
// v2
