/**
 * DockBar.tsx — Нижняя навигационная панель (floating dock).
 *
 * Показывается только на главных страницах: Профиль, Каталог, Продать.
 * Floating-стиль: скруглённый, с glassmorphism-эффектом, приподнят над краем.
 * Активный таб подсвечивается точкой-индикатором и увеличенной иконкой.
 */

import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', icon: '👤', activeIcon: '👤', label: 'Профиль' },
  { path: '/catalog', icon: '🔍', activeIcon: '🔍', label: 'Каталог' },
  { path: '/sell', icon: '✚', activeIcon: '✚', label: 'Продать' },
]

/** Главные страницы, на которых виден док */
const MAIN_PATHS = ['/', '/catalog', '/sell']

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
              {isActive && <span className="dock-tab__indicator" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
