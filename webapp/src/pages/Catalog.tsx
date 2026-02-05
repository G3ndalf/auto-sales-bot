import { useState } from 'react'
import { useBackButton } from '../hooks/useBackButton'
import CarsList from './CarsList'
import PlatesList from './PlatesList'

type Tab = 'cars' | 'plates'

export default function Catalog() {
  useBackButton('/')
  const [tab, setTab] = useState<Tab>('cars')

  return (
    <div className="catalog-page">
      <h1>📋 Каталог</h1>
      <div className="catalog-tabs">
        <button
          className={`catalog-tab ${tab === 'cars' ? 'active' : ''}`}
          onClick={() => setTab('cars')}
        >
          🚗 Авто
        </button>
        <button
          className={`catalog-tab ${tab === 'plates' ? 'active' : ''}`}
          onClick={() => setTab('plates')}
        >
          🔢 Номера
        </button>
      </div>

      {tab === 'cars' ? <CarsList embedded /> : <PlatesList embedded />}
    </div>
  )
}
