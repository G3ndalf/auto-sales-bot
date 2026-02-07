import { useState, useEffect, useRef, useCallback } from 'react'
import { useBackButton } from '../hooks/useBackButton'
import AdsList from './AdsList'

type Tab = 'cars' | 'plates'

/** Сохраняем активный таб между mount/unmount */
let _catalogTab: Tab = 'cars'

/**
 * Функции для сброса кэша списков — вызываются при pull-to-refresh.
 * CarsList и PlatesList экспортируют их.
 */
export function clearCarsCache() {
  // Обнуляем module-level кэш CarsList
  window.__clearCarsCache?.()
}
export function clearPlatesCache() {
  window.__clearPlatesCache?.()
}

export default function Catalog() {
  useBackButton('close')
  const [tab, setTab] = useState<Tab>(_catalogTab)
  /** Ключ для принудительного remount списка (pull-to-refresh) */
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => { _catalogTab = tab }, [tab])

  // ─── Pull-to-refresh ──────────────────────────────────────
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)

  const THRESHOLD = 70 // px для активации refresh

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Начинаем pull только если скролл в самом верху
    if (window.scrollY <= 0) {
      touchStartY.current = e.touches[0].clientY
      isPulling.current = true
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || refreshing) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0 && window.scrollY <= 0) {
      // Замедление: чем дальше тянешь, тем медленнее
      const dist = Math.min(dy * 0.5, 120)
      setPullDistance(dist)
      setPulling(dist > 10)
    } else {
      setPullDistance(0)
      setPulling(false)
    }
  }, [refreshing])

  const handleTouchEnd = useCallback(() => {
    isPulling.current = false
    if (pullDistance >= THRESHOLD && !refreshing) {
      // Триггерим refresh
      setRefreshing(true)
      setPullDistance(THRESHOLD * 0.5)
      // Сбрасываем кэши и remount
      clearCarsCache()
      clearPlatesCache()
      setTimeout(() => {
        setRefreshKey(k => k + 1)
        setRefreshing(false)
        setPullDistance(0)
        setPulling(false)
      }, 600)
    } else {
      setPullDistance(0)
      setPulling(false)
    }
  }, [pullDistance, refreshing])

  return (
    <div
      className="catalog-page"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh индикатор */}
      <div style={{
        height: pulling || refreshing ? pullDistance : 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: pulling ? 'none' : 'height 0.3s ease',
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '2.5px solid rgba(245, 158, 11, 0.2)',
          borderTopColor: '#F59E0B',
          animation: refreshing ? 'spin 0.6s linear infinite' : 'none',
          transform: refreshing ? 'none' : `rotate(${pullDistance * 3}deg)`,
          opacity: Math.min(pullDistance / THRESHOLD, 1),
          transition: refreshing ? 'none' : 'transform 0.1s',
        }} />
      </div>

      <h1>Каталог</h1>
      <div className="catalog-tabs">
        <button
          className={`catalog-tab ${tab === 'cars' ? 'active' : ''}`}
          onClick={() => setTab('cars')}
        >
          Авто
        </button>
        <button
          className={`catalog-tab ${tab === 'plates' ? 'active' : ''}`}
          onClick={() => setTab('plates')}
        >
          Номера
        </button>
      </div>

      {tab === 'cars'
        ? <AdsList key={`cars-${refreshKey}`} adType="car" embedded />
        : <AdsList key={`plates-${refreshKey}`} adType="plate" embedded />
      }

      {/* CSS анимация спиннера */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
