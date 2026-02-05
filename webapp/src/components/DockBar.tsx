/**
 * DockBar.tsx — Нижняя навигационная панель (floating dock).
 *
 * Показывается только на главных страницах: Профиль, Каталог, Продать.
 * Floating-стиль: скруглённый, с glassmorphism-эффектом, приподнят над краем.
 * Активный таб подсвечивается точкой-индикатором и увеличенной иконкой.
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { Magnifer, AddCircle, Star, User } from '@solar-icons/react'

const tabs: { path: string; icon: React.ReactNode; activeIcon: React.ReactNode; label: string }[] = [
  { path: '/catalog', icon: <Magnifer size={22} weight="BoldDuotone" />, activeIcon: <Magnifer size={22} weight="BoldDuotone" />, label: 'Каталог' },
  { path: '/sell', icon: <AddCircle size={22} weight="BoldDuotone" />, activeIcon: <AddCircle size={22} weight="BoldDuotone" />, label: 'Продать' },
  { path: '/favorites', icon: <Star size={22} weight="BoldDuotone" />, activeIcon: <Star size={22} weight="BoldDuotone" />, label: 'Избранное' },
  { path: '/', icon: <User size={22} weight="BoldDuotone" />, activeIcon: <User size={22} weight="BoldDuotone" />, label: 'Профиль' },
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
