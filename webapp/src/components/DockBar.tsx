import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', icon: '👤', label: 'Профиль' },
  { path: '/catalog', icon: '📋', label: 'Каталог' },
  { path: '/sell', icon: '➕', label: 'Продать' },
]

export default function DockBar() {
  const location = useLocation()
  const navigate = useNavigate()

  // Only show dock bar on main pages
  const mainPaths = ['/', '/catalog', '/sell']
  if (!mainPaths.includes(location.pathname)) return null

  return (
    <nav className="dock-bar">
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            className={`dock-tab ${isActive ? 'dock-tab--active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className="dock-tab__icon">{tab.icon}</span>
            <span className="dock-tab__label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
