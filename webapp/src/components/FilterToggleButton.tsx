import { motion } from 'framer-motion'
import { Tuning2, AltArrowUp, AltArrowDown } from '@solar-icons/react'

interface FilterToggleButtonProps {
  isOpen: boolean
  activeCount: number
  onClick: () => void
}

/**
 * FilterToggleButton — кнопка "Фильтры" с бейджем
 * количества активных фильтров и стрелкой вверх/вниз.
 */
export default function FilterToggleButton({ isOpen, activeCount, onClick }: FilterToggleButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        width: '100%',
        padding: 10,
        border: '1.5px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        color: '#F9FAFB',
        fontSize: '0.95em',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background 0.2s',
        background: isOpen ? 'rgba(245,158,11,0.15)' : '#1A2332',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Tuning2 size={16} weight="BoldDuotone" /> Фильтры
      </span>

      {activeCount > 0 && (
        <span
          style={{
            background: '#F59E0B',
            color: '#0B0F19',
            borderRadius: 10,
            padding: '1px 7px',
            fontSize: '0.8em',
            fontWeight: 700,
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {activeCount}
        </span>
      )}

      <span style={{ marginLeft: 'auto', opacity: 0.6, display: 'inline-flex', alignItems: 'center' }}>
        {isOpen ? <AltArrowUp size={14} weight="BoldDuotone" /> : <AltArrowDown size={14} weight="BoldDuotone" />}
      </span>
    </motion.button>
  )
}
