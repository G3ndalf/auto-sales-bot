/**
 * AdminPanel.tsx — Панель администратора.
 *
 * Анимации: stagger статистика, stagger карточки модерации,
 * whileTap кнопки одобрить/отклонить
 */

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Chart, ClockCircle, CheckCircle, CloseCircle, Garage, Hashtag, MapPoint, Phone, ChatRound } from '@solar-icons/react'
import { api } from '../api'
import type { AdminPendingAd, AdminStats } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import { TEXTS } from '../constants/texts'

/* Stagger-контейнер для статистики */
const statsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

/* Stagger-контейнер для карточек модерации */
const adsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

/* Элемент stagger — fade-in + slide-up */
const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function AdminPanel() {
  useBackButton('/')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [ads, setAds] = useState<AdminPendingAd[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
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

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApprove = async (ad: AdminPendingAd) => {
    const key = `${ad.ad_type}-${ad.id}`
    setActionLoading(key)
    try {
      await api.adminApprove(ad.ad_type, ad.id)
      setAds(prev => prev.filter(a => !(a.ad_type === ad.ad_type && a.id === ad.id)))
      setStats(prev => prev ? {
        ...prev,
        pending: prev.pending - 1,
        approved: prev.approved + 1,
      } : prev)
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
      setStats(prev => prev ? {
        ...prev,
        pending: prev.pending - 1,
        rejected: prev.rejected + 1,
      } : prev)
    } catch {
      setError(TEXTS.ADMIN_ERROR)
    }
    setActionLoading(null)
  }

  const formatPrice = (n: number) => n.toLocaleString('ru-RU') + ' ₽'

  if (loading) return <div className="loading">Загрузка...</div>
  if (error && !stats) return <div className="loading">{error}</div>

  return (
    <div className="admin-page">
      <h1>{TEXTS.ADMIN_TITLE}</h1>

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

      {/* Error toast */}
      {error && <div className="admin-error">{error}</div>}

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
                <div className={`admin-ad-badge ${ad.ad_type === 'car' ? 'badge-car' : 'badge-plate'}`}>
                  {ad.ad_type === 'car' ? TEXTS.ADMIN_CAR_LABEL : TEXTS.ADMIN_PLATE_LABEL}
                </div>

                {/* Photo */}
                <div className="admin-ad-photo">
                  {ad.photo ? (
                    <img src={api.photoUrl(ad.photo)} alt="" />
                  ) : (
                    <div className="no-photo">{ad.ad_type === 'car' ? <Garage size={24} weight="BoldDuotone" /> : <Hashtag size={24} weight="BoldDuotone" />}</div>
                  )}
                </div>

                {/* Info */}
                <div className="admin-ad-info">
                  <div className="admin-ad-title">{ad.title}</div>
                  <div className="admin-ad-price">{formatPrice(ad.price)}</div>

                  {ad.ad_type === 'car' && (
                    <div className="admin-ad-details">
                      {ad.mileage?.toLocaleString('ru-RU')} км
                      {' · '}{ad.fuel_type}
                      {' · '}{ad.transmission}
                      {ad.color ? ` · ${ad.color}` : ''}
                      {ad.engine_volume ? ` · ${ad.engine_volume}л` : ''}
                    </div>
                  )}

                  <div className="admin-ad-meta"><MapPoint size={14} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} /> {ad.city}</div>

                  {ad.description && (
                    <div className="admin-ad-desc">
                      {ad.description.length > 150
                        ? ad.description.slice(0, 150) + '...'
                        : ad.description}
                    </div>
                  )}

                  <div className="admin-ad-contacts">
                    <Phone size={14} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} /> {ad.contact_phone}
                    {ad.contact_telegram && <> · <ChatRound size={14} weight="BoldDuotone" style={{ display: 'inline', verticalAlign: 'middle' }} /> {ad.contact_telegram}</>}
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
                    {isProcessing ? '...' : <><CheckCircle size={16} weight="BoldDuotone" /> {TEXTS.ADMIN_BTN_APPROVE}</>}
                  </motion.button>
                  <motion.button
                    className="btn-reject"
                    onClick={() => handleReject(ad)}
                    disabled={isProcessing}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isProcessing ? '...' : <><CloseCircle size={16} weight="BoldDuotone" /> {TEXTS.ADMIN_BTN_REJECT}</>}
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
