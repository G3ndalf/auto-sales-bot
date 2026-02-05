import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import type { CarAdPreview } from '../api'
import { useBackButton } from '../hooks/useBackButton'

export default function CarsList() {
  useBackButton('/catalog')
  const [searchParams] = useSearchParams()
  const brand = searchParams.get('brand') || ''
  const model = searchParams.get('model') || ''
  const city = searchParams.get('city') || ''

  const [ads, setAds] = useState<CarAdPreview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)

  const loadAds = async (newOffset = 0) => {
    setLoading(true)
    try {
      const params: Record<string, string> = { offset: String(newOffset), limit: '20' }
      if (brand) params.brand = brand
      if (model) params.model = model
      if (city) params.city = city
      const data = await api.getCarAds(params)
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
  }, [brand, model, city])

  const title = model ? `${brand} ${model}` : brand || 'Все авто'

  const formatPrice = (n: number) =>
    n.toLocaleString('ru-RU') + ' ₽'

  return (
    <div className="list-page">
      <Link to="/catalog" className="back-btn">← Каталог</Link>
      <h1>{title}</h1>
      <p className="list-count">Найдено: {total}</p>

      {ads.length === 0 && !loading ? (
        <div className="empty-state">
          <p>Нет объявлений</p>
        </div>
      ) : (
        <div className="ads-list">
          {ads.map(ad => (
            <Link to={`/car/${ad.id}`} key={ad.id} className="ad-card">
              <div className="ad-card-photo">
                {ad.photo ? (
                  <img src={api.photoUrl(ad.photo)} alt="" />
                ) : (
                  <div className="no-photo">🚗</div>
                )}
              </div>
              <div className="ad-card-info">
                <div className="ad-card-title">{ad.brand} {ad.model}</div>
                <div className="ad-card-details">
                  {ad.year} • {ad.mileage.toLocaleString('ru-RU')} км
                </div>
                <div className="ad-card-meta">
                  📍 {ad.city} • {ad.fuel_type} • {ad.transmission}
                </div>
                <div className="ad-card-price">{formatPrice(ad.price)}</div>
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
