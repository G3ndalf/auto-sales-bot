/**
 * App.tsx — Корневой компонент.
 *
 * Основные страницы загружаются eagerly (нет flash от Suspense).
 * Редкие страницы (создание/редактирование/админка) — lazy.
 * Suspense fallback={null}: никакого "Загрузка...", fade-in скроет задержку.
 */

import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import DockBar from './components/DockBar'
import './App.css'

/* ─── Eager: основные страницы (посещаются всегда) ─── */
import Profile from './pages/Profile'
import Catalog from './pages/Catalog'
import CarsList from './pages/CarsList'
import PlatesList from './pages/PlatesList'
import CarAdDetail from './pages/CarAdDetail'
import PlateAdDetail from './pages/PlateAdDetail'
import Favorites from './pages/Favorites'
import MyAds from './pages/MyAds'
import AdminPanel from './pages/AdminPanel'

/* ─── Lazy: редкие страницы ─── */
const Sell = lazy(() => import('./pages/Sell'))
const CreateCarAd = lazy(() => import('./pages/CreateCarAd'))
const CreatePlateAd = lazy(() => import('./pages/CreatePlateAd'))
const EditCarAd = lazy(() => import('./pages/EditCarAd'))
const EditPlateAd = lazy(() => import('./pages/EditPlateAd'))

/** Быстрый fade-in без exit-задержки */
function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <Suspense fallback={null}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage><Catalog /></AnimatedPage>} />
        <Route path="/sell" element={<AnimatedPage><Sell /></AnimatedPage>} />
        <Route path="/car/new" element={<AnimatedPage><CreateCarAd /></AnimatedPage>} />
        <Route path="/plate/new" element={<AnimatedPage><CreatePlateAd /></AnimatedPage>} />
        <Route path="/profile" element={<AnimatedPage><Profile /></AnimatedPage>} />
        <Route path="/catalog" element={<AnimatedPage><Catalog /></AnimatedPage>} />
        <Route path="/cars" element={<AnimatedPage><CarsList /></AnimatedPage>} />
        <Route path="/car/:id" element={<AnimatedPage><CarAdDetail /></AnimatedPage>} />
        <Route path="/plates" element={<AnimatedPage><PlatesList /></AnimatedPage>} />
        <Route path="/plate/:id" element={<AnimatedPage><PlateAdDetail /></AnimatedPage>} />
        <Route path="/my-ads" element={<AnimatedPage><MyAds /></AnimatedPage>} />
        <Route path="/car/:id/edit" element={<AnimatedPage><EditCarAd /></AnimatedPage>} />
        <Route path="/plate/:id/edit" element={<AnimatedPage><EditPlateAd /></AnimatedPage>} />
        <Route path="/favorites" element={<AnimatedPage><Favorites /></AnimatedPage>} />
        <Route path="/admin" element={<AnimatedPage><AdminPanel /></AnimatedPage>} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <div className="app">
      <AnimatedRoutes />
      <DockBar />
    </div>
  )
}

export default App
