import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import type { AdminPendingAd, AdminStats } from '../api'
import { useBackButton } from '../hooks/useBackButton'
import { TEXTS } from '../constants/texts'

export default function AdminPanel() {
  useBackButton('close')
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

      {/* Stats */}
      {stats && (
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">{TEXTS.ADMIN_STATS_TOTAL}</div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">{TEXTS.ADMIN_STATS_PENDING}</div>
          </div>
          <div className="stat-card stat-approved">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">{TEXTS.ADMIN_STATS_APPROVED}</div>
          </div>
          <div className="stat-card stat-rejected">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">{TEXTS.ADMIN_STATS_REJECTED}</div>
          </div>
        </div>
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
        <div className="admin-ads-list">
          {ads.map(ad => {
            const key = `${ad.ad_type}-${ad.id}`
            const isProcessing = actionLoading === key
            return (
              <div className="admin-ad-card" key={key}>
                {/* Badge */}
                <div className={`admin-ad-badge ${ad.ad_type === 'car' ? 'badge-car' : 'badge-plate'}`}>
                  {ad.ad_type === 'car' ? TEXTS.ADMIN_CAR_LABEL : TEXTS.ADMIN_PLATE_LABEL}
                </div>

                {/* Photo */}
                <div className="admin-ad-photo">
                  {ad.photo ? (
                    <img src={api.photoUrl(ad.photo)} alt="" />
                  ) : (
                    <div className="no-photo">{ad.ad_type === 'car' ? '🚗' : '🔢'}</div>
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

                  <div className="admin-ad-meta">📍 {ad.city}</div>

                  {ad.description && (
                    <div className="admin-ad-desc">
                      {ad.description.length > 150
                        ? ad.description.slice(0, 150) + '...'
                        : ad.description}
                    </div>
                  )}

                  <div className="admin-ad-contacts">
                    📞 {ad.contact_phone}
                    {ad.contact_telegram && <> · 📱 {ad.contact_telegram}</>}
                  </div>
                </div>

                {/* Actions */}
                <div className="admin-ad-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(ad)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '...' : `✅ ${TEXTS.ADMIN_BTN_APPROVE}`}
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(ad)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '...' : `❌ ${TEXTS.ADMIN_BTN_REJECT}`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
