import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { CarAdPreview, Brand, City } from '../api'
import { useBackButton } from '../hooks/useBackButton'

interface Props {
  embedded?: boolean
}

export default function CarsList({ embedded }: Props) {
  if (!embedded) useBackButton('/catalog')

  const [ads, setAds] = useState<CarAdPreview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)

  // Filters
  const [brands, setBrands] = useState<Brand[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  // Load filter options
  useEffect(() => {
    api.getBrands().then(setBrands).catch(() => {})
    api.getCities().then(setCities).catch(() => {})
  }, [])

  const buildParams = (newOffset: number, brand = selectedBrand, city = selectedCity) => {
    const params: Record<string, string> = { offset: String(newOffset), limit: '20' }
    if (brand) params.brand = brand
    if (city) params.city = city
    return params
  }

  const loadAds = async (newOffset = 0, brand = selectedBrand, city = selectedCity) => {
    setLoading(true)
    try {
      const params = buildParams(newOffset, brand, city)
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
  }, [])

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand)
    setOffset(0)
    setAds([])
    loadAds(0, brand, selectedCity)
  }

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    setOffset(0)
    setAds([])
    loadAds(0, selectedBrand, city)
  }

  const formatPrice = (n: number) =>
    n.toLocaleString('ru-RU') + ' ₽'

  if (loading && ads.length === 0 && brands.length === 0) {
    return <div className="loading">Загрузка...</div>
  }

  return (
    <div className={embedded ? 'catalog-content' : 'list-page'}>
      {!embedded && (
        <>
          <Link to="/catalog" className="back-btn">← Каталог</Link>
          <h1>🚗 Все авто</h1>
        </>
      )}

      <div className="filters-bar">
        <select
          className="filter-select"
          value={selectedBrand}
          onChange={e => handleBrandChange(e.target.value)}
        >
          <option value="">Все марки</option>
          {brands.map(b => (
            <option key={b.brand} value={b.brand}>
              {b.brand} ({b.count})
            </option>
          ))}
        </select>

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
          <div className="empty-icon">🚗</div>
          <p>Пока нет объявлений</p>
        </div>
      ) : (
        <div className="ads-list">
          {ads.map(ad => (
            <Link to={`/car/${ad.id}`} key={ad.id} className="ad-card">
              <div className="ad-card-photo">
                {ad.photo ? (
                  <img src={api.photoUrl(ad.photo)} alt="" loading="lazy" />
                ) : (
                  <div className="no-photo">🚗</div>
                )}
              </div>
              <div className="ad-card-info">
                <div className="ad-card-title">{ad.brand} {ad.model}</div>
                <div className="ad-card-year">{ad.year} г.</div>
                <div className="ad-card-details">
                  {ad.mileage.toLocaleString('ru-RU')} км • {ad.fuel_type} • {ad.transmission}
                </div>
                <div className="ad-card-location">📍 {ad.city}</div>
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
