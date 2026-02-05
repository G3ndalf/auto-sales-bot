import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { PlateAdPreview, City } from '../api'
import { useBackButton } from '../hooks/useBackButton'

interface Props {
  embedded?: boolean
}

export default function PlatesList({ embedded }: Props) {
  if (!embedded) useBackButton('/catalog')

  const [ads, setAds] = useState<PlateAdPreview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)

  // Filters
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState('')

  // Load filter options
  useEffect(() => {
    api.getCities().then(setCities).catch(() => {})
  }, [])

  const buildParams = (newOffset: number, city = selectedCity) => {
    const params: Record<string, string> = { offset: String(newOffset), limit: '20' }
    if (city) params.city = city
    return params
  }

  const loadAds = async (newOffset = 0, city = selectedCity) => {
    setLoading(true)
    try {
      const params = buildParams(newOffset, city)
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
  }, [])

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    setOffset(0)
    setAds([])
    loadAds(0, city)
  }

  const formatPrice = (n: number) =>
    n.toLocaleString('ru-RU') + ' ₽'

  if (loading && ads.length === 0 && cities.length === 0) {
    return <div className="loading">Загрузка...</div>
  }

  return (
    <div className={embedded ? 'catalog-content' : 'list-page'}>
      {!embedded && (
        <>
          <Link to="/catalog" className="back-btn">← Каталог</Link>
          <h1>🔢 Номера</h1>
        </>
      )}

      <div className="filters-bar">
        <select
          className="filter-select"
          value={selectedCity}
          onChange={e => handleCityChange(e.target.value)}
        >
          <option value="">Все города</option>
          {cities.map(c => (
            <option key={c.city} value={c.city}>
              {c.city} ({c.count})
            </option>
          ))}
        </select>
      </div>

      {total > 0 && <p className="list-count">Найдено: {total}</p>}

      {!loading && ads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔢</div>
          <p>Пока нет объявлений</p>
        </div>
      ) : (
        <div className="ads-list">
          {ads.map(ad => (
            <Link to={`/plate/${ad.id}`} key={ad.id} className="ad-card plate-card">
              <div className="plate-number-display">{ad.plate_number}</div>
              <div className="ad-card-info">
                <div className="ad-card-price">{formatPrice(ad.price)}</div>
                <div className="ad-card-location">📍 {ad.city}</div>
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
