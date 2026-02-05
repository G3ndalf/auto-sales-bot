/**
 * DockBar.tsx — Нижняя навигационная панель (floating dock).
 *
 * Показывается только на главных страницах: Профиль, Каталог, Продать.
 * Floating-стиль: скруглённый, с glassmorphism-эффектом, приподнят над краем.
 * Активный таб подсвечивается точкой-индикатором и увеличенной иконкой.
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { User, Search, PlusCircle, Star } from 'lucide-react'

const tabs: { path: string; icon: React.ReactNode; activeIcon: React.ReactNode; label: string }[] = [
  { path: '/catalog', icon: <Search size={22} />, activeIcon: <Search size={22} strokeWidth={2.5} />, label: 'Каталог' },
  { path: '/sell', icon: <PlusCircle size={22} />, activeIcon: <PlusCircle size={22} strokeWidth={2.5} />, label: 'Продать' },
  { path: '/favorites', icon: <Star size={22} />, activeIcon: <Star size={22} fill="currentColor" />, label: 'Избранное' },
  { path: '/', icon: <User size={22} />, activeIcon: <User size={22} strokeWidth={2.5} />, label: 'Профиль' },
]

/** Главные страницы, на которых виден док */
const MAIN_PATHS = ['/', '/catalog', '/sell', '/favorites']

export default function DockBar() {
  const location = useLocation()
  const navigate = useNavigate()

  if (!MAIN_PATHS.includes(location.pathname)) return null

  return (
    <nav className="dock-bar">
      <div className="dock-bar__inner">
        {tabs.map(tab => {
          const isActive = location.pathname === tab.path
          return (
            <button
              key={tab.path}
              className={`dock-tab ${isActive ? 'dock-tab--active' : ''}`}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="dock-tab__icon">
                {isActive ? tab.activeIcon : tab.icon}
              </span>
              <span className="dock-tab__label">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
