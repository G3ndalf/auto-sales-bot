import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Brand, Model } from '../api'
import { useBackButton } from '../hooks/useBackButton'

type View = 'brands' | 'models'

export default function Catalog() {
  useBackButton('/')
  const [view, setView] = useState<View>('brands')
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getBrands().then(data => {
      setBrands(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const selectBrand = async (brand: string) => {
    setSelectedBrand(brand)
    setLoading(true)
    try {
      const data = await api.getModels(brand)
      setModels(data)
      setView('models')
    } catch {
      // ignore
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  return (
    <div className="catalog-page">
      {view === 'brands' ? (
        <>
          <h1>🚗 Каталог по маркам</h1>
          {brands.length === 0 ? (
            <div className="empty-state">
              <p>Пока нет объявлений</p>
            </div>
          ) : (
            <div className="catalog-list">
              {brands.map(b => (
                <div
                  key={b.brand}
                  className="catalog-item"
                  onClick={() => selectBrand(b.brand)}
                >
                  <span className="catalog-item-name">{b.brand}</span>
                  <span className="catalog-item-count">{b.count}</span>
                </div>
              ))}
            </div>
          )}

          <div className="catalog-nav">
            <Link to="/plates" className="btn btn-secondary">
              🔢 Номера
            </Link>
          </div>
        </>
      ) : (
        <>
          <button className="back-btn" onClick={() => setView('brands')}>
            ← {selectedBrand}
          </button>
          <h1>{selectedBrand}</h1>

          <Link
            to={`/cars?brand=${encodeURIComponent(selectedBrand)}`}
            className="catalog-item"
            style={{ marginBottom: 12 }}
          >
            <span className="catalog-item-name">Все модели</span>
            <span className="catalog-item-count">→</span>
          </Link>

          <div className="catalog-list">
            {models.map(m => (
              <Link
                key={m.model}
                to={`/cars?brand=${encodeURIComponent(selectedBrand)}&model=${encodeURIComponent(m.model)}`}
                className="catalog-item"
              >
                <span className="catalog-item-name">{m.model}</span>
                <span className="catalog-item-count">{m.count}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
