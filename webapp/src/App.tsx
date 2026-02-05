/**
 * App.tsx — Корневой компонент приложения.
 *
 * Используем React.lazy() для всех страниц:
 * - Изолирует ошибки импорта: если один компонент сломан, остальные работают
 * - Уменьшает начальный бандл (code splitting)
 * - Каждый lazy-компонент обёрнут в Suspense с fallback "Загрузка..."
 *
 * Framer Motion AnimatePresence для плавных переходов между страницами.
 * Вся навигация через React Router v6.
 */

import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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

/** Анимация перехода между страницами (fast fade-in, no exit delay) */
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

const pageTransition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1], // cubic-bezier
}

/**
 * Fallback-компонент при загрузке lazy-модулей.
 * Видимый индикатор — помогает отличить "загрузка" от "чёрный экран".
 */
function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-[#6b7280] text-base font-[-apple-system,system-ui,sans-serif]">
      Загрузка...
    </div>
  )
}

/** Обёртка для анимированных страниц */
function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence>
      <Suspense fallback={<Loading />} key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<AnimatedPage><Profile /></AnimatedPage>} />
          <Route path="/sell" element={<AnimatedPage><Sell /></AnimatedPage>} />
          <Route path="/car/new" element={<AnimatedPage><CreateCarAd /></AnimatedPage>} />
          <Route path="/plate/new" element={<AnimatedPage><CreatePlateAd /></AnimatedPage>} />
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
    </AnimatePresence>
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
