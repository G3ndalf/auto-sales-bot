import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import type { PlateAdPreview } from '../api'
import { useBackButton } from '../hooks/useBackButton'

export default function PlatesList() {
  useBackButton('/catalog')
  const [searchParams] = useSearchParams()
  const city = searchParams.get('city') || ''

  const [ads, setAds] = useState<PlateAdPreview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)

  const loadAds = async (newOffset = 0) => {
    setLoading(true)
    try {
      const params: Record<string, string> = { offset: String(newOffset), limit: '20' }
      if (city) params.city = city
      const data = await api.getPlateAds(params)
      if (newOffset === 0) {
        setAds(data.items)
      } else {
        setAds(prev => [...prev, ...data.items])
      }
      setTotal(data.total)
      setOffset(newOffset + data.items.length)
    } catch {
      // ignore
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAds(0)
  }, [city])

  const formatPrice = (n: number) =>
    n.toLocaleString('ru-RU') + ' ₽'

  return (
    <div className="list-page">
      <Link to="/catalog" className="back-btn">← Каталог</Link>
      <h1>🔢 Номера</h1>
      <p className="list-count">Найдено: {total}</p>

      {ads.length === 0 && !loading ? (
        <div className="empty-state">
          <p>Нет объявлений</p>
        </div>
      ) : (
        <div className="ads-list">
          {ads.map(ad => (
            <Link to={`/plate/${ad.id}`} key={ad.id} className="ad-card plate-card">
              <div className="plate-number-display">{ad.plate_number}</div>
              <div className="ad-card-info">
                <div className="ad-card-price">{formatPrice(ad.price)}</div>
                <div className="ad-card-meta">📍 {ad.city}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {ads.length < total && (
        <button
          className="btn btn-secondary load-more"
          onClick={() => loadAds(offset)}
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Показать ещё'}
        </button>
      )}
    </div>
  )
}
