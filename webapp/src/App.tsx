/**
 * App.tsx — Корневой компонент приложения.
 *
 * Используем React.lazy() для всех страниц:
 * - Изолирует ошибки импорта: если один компонент сломан, остальные работают
 * - Уменьшает начальный бандл (code splitting)
 * - Каждый lazy-компонент обёрнут в Suspense с fallback "Загрузка..."
 *
 * Вся навигация через React Router v6.
 */

import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import DockBar from './components/DockBar'
import './App.css'

/* ─── Lazy-загрузка всех страниц ─── */
const Profile = lazy(() => import('./pages/Profile'))
const Sell = lazy(() => import('./pages/Sell'))
const CreateCarAd = lazy(() => import('./pages/CreateCarAd'))
const CreatePlateAd = lazy(() => import('./pages/CreatePlateAd'))
const Catalog = lazy(() => import('./pages/Catalog'))
const CarsList = lazy(() => import('./pages/CarsList'))
const CarAdDetail = lazy(() => import('./pages/CarAdDetail'))
const PlatesList = lazy(() => import('./pages/PlatesList'))
const PlateAdDetail = lazy(() => import('./pages/PlateAdDetail'))
const MyAds = lazy(() => import('./pages/MyAds'))
const EditCarAd = lazy(() => import('./pages/EditCarAd'))
const EditPlateAd = lazy(() => import('./pages/EditPlateAd'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const Favorites = lazy(() => import('./pages/Favorites'))

/**
 * Fallback-компонент при загрузке lazy-модулей.
 * Видимый индикатор — помогает отличить "загрузка" от "чёрный экран".
 */
function Loading() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      color: '#6b7280',
      fontSize: '16px',
      fontFamily: '-apple-system, system-ui, sans-serif',
    }}>
      Загрузка...
    </div>
  )
}

function App() {
  return (
    <div className="app">
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Profile />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/car/new" element={<CreateCarAd />} />
          <Route path="/plate/new" element={<CreatePlateAd />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/cars" element={<CarsList />} />
          <Route path="/car/:id" element={<CarAdDetail />} />
          <Route path="/plates" element={<PlatesList />} />
          <Route path="/plate/:id" element={<PlateAdDetail />} />
          <Route path="/my-ads" element={<MyAds />} />
          <Route path="/car/:id/edit" element={<EditCarAd />} />
          <Route path="/plate/:id/edit" element={<EditPlateAd />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Suspense>
      <DockBar />
    </div>
  )
}

export default App
