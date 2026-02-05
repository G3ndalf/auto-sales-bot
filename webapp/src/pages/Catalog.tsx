import { useState, useEffect } from 'react'
import { useBackButton } from '../hooks/useBackButton'
import CarsList from './CarsList'
import PlatesList from './PlatesList'

type Tab = 'cars' | 'plates'

/** Сохраняем активный таб между mount/unmount (при возврате из карточки) */
let _catalogTab: Tab = 'cars'

export default function Catalog() {
  // Каталог открывается напрямую через кнопку бота →
  // "назад" должен закрывать Mini App, а не переходить на Profile
  useBackButton('close')
  const [tab, setTab] = useState<Tab>(_catalogTab)

  /** Сохраняем таб при переключении */
  useEffect(() => { _catalogTab = tab }, [tab])

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
